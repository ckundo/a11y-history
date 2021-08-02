import { File, Location, ResultLocation } from "./types.js";

import { tree, blame, fetchPatch, range, sleep } from "./utils.js";
import { scan } from "./scan.js";
import { DiffChunk, parseUnifiedDiff } from '@alloc/git-patch-parser'

const extension = /\.(html|hbs|erb|liquid)$/;

export async function run({ owner, repo }: { owner: string, repo: string }) {
  const files: File[] = await tree({ owner, repo });

  console.log(`Reviewing ${files.length} files for ${extension} templates.`)

  files
    .filter((file) => file.type === "blob" && file.path.match(extension))
    .forEach(async (file, index) => {
      await sleep({ millis: 300 * index });

      try {
        const { ranges, content } = await blame({ owner, repo, file });
        file.contents = content;

        const results: ResultLocation[] = await scan({ file });

        if (results.length === 0) {
          return;
        }

        results.map((result) => {
          const lintRanges: (number[] | undefined)[] = result.locations
            .map((location) => {
              if (!location) {
                return;
              }

              const { startLine, endLine } = location;
              return range({ start: startLine, end: endLine });
            })
            .filter((range) => range);

          if (lintRanges.length === 0) { return; }

          ranges
            .filter((blameRange) => {
              const { lines } = blameRange;

              if (!lines) {
                return [];
              }

              const { start, end } = lines;

              return range({ start, end }).some((line) => {
                return lintRanges.flat().includes(line);
              });
            })
            .map((range) => range.commit)
            .forEach(async ({ sha, author }) => {
              const patch: string | null = await fetchPatch({
                owner,
                repo,
                sha,
                path: file.path,
              });

              if (!patch) {
                return;
              }

              const offense: DiffChunk | undefined = parseUnifiedDiff(
                patch
              ).find((chunk) => {
                const additionRange: number[] = range({
                  start: chunk.outputRange.start,
                  end: chunk.outputRange.length + chunk.outputRange.start,
                });

                return result.locations.some((location: Location | null) =>
                  range({
                    start: location?.startLine,
                    end: location?.endLine,
                  }).some((line) => additionRange.includes(line))
                );
              });

              if (offense) {
                console.log(
                  `${process.env.BASE_URL || 'https://github.com'}/${owner}/${repo}/blob/${sha}/${file.path}#L${lintRanges[0]![0]}-L${lintRanges[0]![lintRanges[0]!.length - 1]}`,
                  author,
                  result.violation.help
                );
              }
            });
        });
      } catch (error) {
        throw error;
      }
    });
};

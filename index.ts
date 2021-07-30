import { File, Location, ResultLocation } from "./types.js";

import { tree, blame, fetchPatch, range, sleep, fetchContents } from "./utils.js";
import { scan } from "./scan.js";
import { DiffChunk, parseUnifiedDiff } from '@alloc/git-patch-parser'

const owner = process.env.A11Y_BLAME_OWNER!;
const repo = process.env.A11Y_BLAME_REPO!;
const extension = /\.(html|hbs)/;

(async function () {
  const files: File[] = await tree({ owner, repo });

  files
    .filter((file) => file.type === "blob" && file.path.match(extension))
    .forEach(async (file, index) => {
      await sleep({ millis: 200 * index });

      console.log(file.path)

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

              const contents: string | null = await fetchContents({
                owner,
                repo,
                sha,
                path: file.path,
              });

              const commitFile: File = { path: file.path, contents: contents! };
              const results: ResultLocation[] = await scan({ file: commitFile });

              if (offense) {
                console.log(
                  file.path,
                  sha,
                  author,
                  lintRanges.map((range) => range![0]),
                  result.violation.help
                );
              }
            });
        });
      } catch (error) {
        console.warn(error);
        return;
      }
    });
})();

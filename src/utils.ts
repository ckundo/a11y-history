import { graphql } from "@octokit/graphql";
import {
  GraphQlQueryResponseData,
} from "@octokit/graphql/dist-types/types";
import { Octokit } from "@octokit/rest";
import { File, BlameResult, BlameRange } from "./types.js";
import { query as blameQuery } from './blameQuery.js'

export async function tree({
  owner,
  repo,
}: {
  owner: string;
  repo: string;
}): Promise<File[]> {
  const octokit = new Octokit({
    baseUrl: process.env.BASE_URL || "https://api.github.com",
    auth: process.env.GITHUB_TOKEN,
  });

  try {
    const {
      data: { tree },
    } = await octokit.rest.git.getTree({
      owner,
      repo,
      tree_sha: "HEAD",
      recursive: "true",
    });

    return tree as File[];
  } catch (error) {
    throw error;
  }
}

export async function blame({
  file,
  owner,
  repo,
}: {
  file: File;
  owner: string;
  repo: string;
}): Promise<BlameResult> {
  const response: GraphQlQueryResponseData = await graphql(blameQuery, {
    owner,
    name: repo,
    path: file.path,
    baseUrl: process.env.BASE_URL || "https://api.github.com",
    expression: `HEAD:${file.path}`,
    headers: {
      authorization: `token ${process.env.GITHUB_TOKEN}`,
    },
  });

  const { ranges } = response.repository.defaultBranchRef.target.blame;
  const { text } = response.repository.object;

  const blameRanges: BlameRange[] = ranges.map(
    ({
      startingLine,
      endingLine,
      commit,
    }: {
      startingLine: number;
      endingLine: number;
      commit: GraphQlQueryResponseData;
    }) => {
      return {
        lines: {
          start: startingLine,
          end: endingLine,
        },
        commit: {
          files: [file],
          sha: commit.oid,
          author: commit.author.user?.login,
          date: commit.authoredDate,
        },
      };
    }
  );

  return {
    ranges: blameRanges,
    content: text as string,
  };
}

export async function fetchContents({
  sha,
  owner,
  repo,
  path,
}: {
  sha: string;
  owner: string;
  repo: string;
  path: string;
}): Promise<string | null> {
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });



  try {
    const data = await octokit.repos.getContent({
      owner,
      repo,
      path,
      ref: sha,
    }) as any;

    return data.content;
  } catch (err) {
    throw err;
  }
}

export async function fetchPatch({
  sha,
  owner,
  repo,
  path,
}: {
  sha: string;
  owner: string;
  repo: string;
  path: string;
}): Promise<string | null> {
  const octokit = new Octokit({
    baseUrl: process.env.BASE_URL || "https://api.github.com",
    auth: process.env.GITHUB_TOKEN,
  });

  try {
    const {
      data: { files },
    } = await octokit.request("GET /repos/{owner}/{repo}/commits/{ref}", {
      owner,
      repo,
      path,
      ref: sha,
    });

    return files?.find((file) => file.filename === path)?.patch! || null;
  } catch (err) {
    throw err;
  }
}

export function range({start, end}: { start: number | undefined, end: number | undefined }): number[] {
  if (!start || !end) { return []; }
  return Array.from(
    { length: end - start + 1 },
    (_, i) => i + start
  );
}

export function sleep({ millis }: { millis: number }) {
  return new Promise((resolve) => setTimeout(resolve, millis));
}

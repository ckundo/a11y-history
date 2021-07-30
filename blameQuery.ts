import { Query } from "@octokit/graphql/dist-types/types";

export const query: Query = `query BlameRanges($owner: String!, $name: String!, $path: String!, $expression: String!) {
  repository(owner: $owner, name: $name) {
    defaultBranchRef {
      target {
        ... on Commit {
          blame(path: $path) {
            ranges {
              startingLine
              endingLine
              commit {
                oid
                author {
                  email
                  name
                  user {
                    id
                    login
                  }
                }
                authoredDate
                commitUrl
              }
            }
          }
        }
      }
    }
    object(expression: $expression) {
      ... on Blob {
        text
      }
    }
  }
}
`;

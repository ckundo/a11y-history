import { run } from './index.js';

export async function cli(argv: string[]) {
  const project: string = argv[0];
  const [owner, repo] = project.split('/');

  await run({ owner, repo });
}

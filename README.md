## A11Y Blame

- Find out the specific commit and line number that introduced an accessibility failure into a git repo.

A11y Blame outputs the author and link to the commit and line where an accessibility error is added.

## Usage

    GITHUB_TOKEN=<...> npx a11y-blame <owner>/<repo>

### GitHub Enterprise

    BASE_URL=https://git.example.com/api/v3 GITHUB_TOKEN=<...> npx a11y-blame <owner>/<repo>

## Example

    % npx a11y-blame dequelabs/axe-core

Outputs: 

```
Reviewing 1914 files for /\.(html|hbs|erb|liquid)$/ templates.
Scanning doc/examples/qunit/test/test.html
Scanning test/integration/full/aria-hidden-body/fail.html
Scanning test/integration/full/aria-hidden-body/frames/frame-hidden-body.html
https://github.com/dequelabs/axe-core/blob/f2f15377c917d0b6fc27d2181f64ebef26e5a9b0/doc/examples/qunit/test/test.html#L26-L26 straker Form elements must have labels
```

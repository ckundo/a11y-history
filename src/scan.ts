import "jsdom-global/register";
import { FrameContext, PartialRuleResult, Result, RunOptions, source } from "axe-core";
import { JSDOM } from "jsdom";
import { File, Location, ResultLocation } from "./types";

function runPartialRecursive(context: any, options = {}, win: any) {
  const { axe } = win;
  const frameContexts: FrameContext[] = axe.utils.getFrameContexts(context);
  const promiseResults: PartialRuleResult[] = [ axe.runPartial(context, options) ];

  frameContexts.forEach(({ frameSelector, frameContext }) =>  {
    const { contentWindow } = axe.utils.shadowSelect(frameSelector);
    const frameResults = runPartialRecursive(frameContext, options, contentWindow);
    promiseResults.push(...frameResults);
  });

  return promiseResults;
};

export async function scan({
  file,
}: {
  file: File;
}): Promise<ResultLocation[]> {
  const contents = `<script>window.onerror = (err) => console.log('JSDOM error', err);</script><main>${file.contents}</main>`;
  const config: RunOptions = {
    resultTypes: ["violations"]
  };
  const rules: { id: string }[] = [
      { id: "audio-caption" },
      { id: "button-name" },
      { id: "image-alt" },
      { id: "input-button-name" },
      { id: "label" },
      { id: "link-name" },
      { id: "marquee" },
      { id: "meta-refresh" },
      { id: "nested-interactive" },
      { id: "object-alt" },
      { id: "role-img-alt" },
      { id: "server-side-image-map" },
      { id: "svg-img-alt" },
      { id: "td-headers-attr" },
      { id: "th-has-data-cells" },
      { id: "video-caption" },
      { id: "autocomplete-valid" },
      { id: "avoid-inline-spacing" },
      { id: "empty-table-header" },
  ];

  try {
    console.log(`Scanning ${file.path}`)
    const dom = new JSDOM(contents, {
      includeNodeLocations: true,
      pretendToBeVisual: true,
      runScripts: "outside-only",
    });
    const { window } = dom;

    window.addEventListener("error", (event) => { /* noop */ });

    window.eval(source);

    window.axe.configure({
      rules,
      disableOtherRules: true,
    });

    const context = window.document.body;
    const results: PartialRuleResult[] = await Promise.all(runPartialRecursive(context, config, window as any));
    const { violations }: { violations: Result[] } = await window.axe.finishRun(results, config);

    return violations.map((violation) => {
      const elements: (HTMLElement | null)[] = violation.nodes.map((node) =>
        window.document.querySelector(node.target.join(","))
      );
      const locations: (Location | null)[] = elements.map((element) => {
        if (!element) {
          return null;
        }
        return dom.nodeLocation(element as Node) as Location;
      });

      return {
        violation,
        locations,
      };
    });
  } catch (error) {
    return [];
  }
}

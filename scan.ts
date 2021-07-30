import "jsdom-global/register";
import axe, { ElementContext, Result, RuleObject, RunCallback, RunOptions, source } from "axe-core";
import { JSDOM } from "jsdom";
import { File, Location, ResultLocation } from "./types";

export async function scan({
  file,
}: {
  file: File;
}): Promise<ResultLocation[]> {
  const dom = new JSDOM(file.contents, {
    includeNodeLocations: true,
    pretendToBeVisual: true,
    runScripts: "dangerously",
  });
  const { window } = dom;
  window.eval(source);

  const config: RunOptions = {
    rules: {
      "color-contrast": { enabled: false },
    },
  };

  try {
    const { violations }: { violations: Result[] } = await window.axe.run(
      window.document.body,
      config
    );

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
    console.warn(error);
    return [];
  }
}

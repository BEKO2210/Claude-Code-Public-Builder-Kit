import { buildContext } from "./context.js";
import readme from "./templates/readme.js";
import claude from "./templates/claude.js";
import masterplan from "./templates/masterplan.js";
import roadmap from "./templates/roadmap.js";
import runlog from "./templates/runlog.js";
import acceptance from "./templates/acceptance.js";
import architecture from "./templates/architecture.js";
import initialPrompt from "./templates/initialPrompt.js";
import runPlan from "./templates/runPlan.js";
import productBrief from "./templates/productBrief.js";
import marketPositioning from "./templates/marketPositioning.js";
import technicalDecisions from "./templates/technicalDecisions.js";

const FILE_PLAN = [
  { path: "README.md", render: readme },
  { path: "CLAUDE.md", render: claude },
  { path: "MASTERPLAN.md", render: masterplan },
  { path: "ROADMAP.md", render: roadmap },
  { path: "RUN_LOG.md", render: runlog },
  { path: "ACCEPTANCE_CRITERIA.md", render: acceptance },
  { path: "ARCHITECTURE.md", render: architecture },
  { path: "PROMPTS/initial-prompt.md", render: initialPrompt },
  { path: "PROMPTS/run-plan-20-sessions.md", render: runPlan },
  { path: "DOCS/product-brief.md", render: productBrief },
  { path: "DOCS/market-positioning.md", render: marketPositioning },
  { path: "DOCS/technical-decisions.md", render: technicalDecisions }
];

export function generateKit(rawIdea, opts = {}) {
  const ctx = buildContext(rawIdea, opts);
  const files = FILE_PLAN.map(({ path, render }) => ({
    path,
    content: render(ctx)
  }));
  return { context: ctx, files };
}

export { FILE_PLAN };

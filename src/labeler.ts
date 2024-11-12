import { LabelerServer } from "@skyware/labeler";
import type { ComAtprotoLabelDefs } from "@atcute/client/lexicons";
import { LABEL_LIMIT } from "./constants";

const LABELER_PORT = 8002;

const server = new LabelerServer({
  did: Bun.env.LABELER_DID as string,
  signingKey: Bun.env.SIGNING_KEY as string,
});

export function deleteAllLabels(did: string, labels: Set<string>) {
  const labelsToDelete: string[] = Array.from(labels);

  if (labelsToDelete.length === 0) {
    console.info(`No labels to delete`);
  } else {
    console.info(`Labels to delete: ${labelsToDelete.join(", ")}`);
    try {
      server.createLabels({ uri: did }, { negate: labelsToDelete });
      console.info("Successfully deleted all labels");
    } catch (error) {
      console.error(`Error deleting all labels: ${error}`);
    }
  }
}

export function fetchCurrentLabels(did: string) {
  const query = server.db
    .prepare<string[]>(`select * from labels where uri = ?`)
    .all(did) as ComAtprotoLabelDefs.Label[];

  const labels = query.reduce((set, label) => {
    if (!label.neg) set.add(label.val);
    else set.delete(label.val);
    return set;
  }, new Set<string>());

  if (labels.size > 0) {
    console.info(`Current labels: ${Array.from(labels).join(", ")}`);
  }

  return labels;
}

export async function addLabelToUser(did: string, indentifier: string) {
  const query = server.db
    .prepare<string[]>(`select * from labels where uri = ?`)
    .all(did) as ComAtprotoLabelDefs.Label[];

  const labels = query.reduce((set, label) => {
    if (!label.neg) set.add(label.val);
    else set.delete(label.val);
    return set;
  }, new Set<string>());

  try {
    if (labels.size < LABEL_LIMIT) {
      server.createLabel({ uri: did, val: indentifier });
      console.log(`${new Date().toISOString()} Labeled ${did}: ${indentifier}`);
    }
  } catch (err) {
    console.error(err);
  }
}

server.start(LABELER_PORT, (error) => {
  if (error) {
    console.error("Failed to start server", error);
  } else {
    console.log("Labeler server running on port " + LABELER_PORT);
  }
});

import { parse, unparse } from "papaparse";
import { toast } from "sonner";
import { Artifact } from "@/components/create-artifact";
import {
  CopyIcon,
  LineChartIcon,
  RedoIcon,
  SparklesIcon,
  UndoIcon,
} from "@/components/icons";
import { SpreadsheetEditor } from "@/components/sheet-editor";

type Metadata = any;

export const sheetArtifact = new Artifact<"sheet", Metadata>({
  kind: "sheet",
  description: "Huu ich cho du lieu bang bieu",
  initialize: () => null,
  onStreamPart: ({ setArtifact, streamPart }) => {
    if (streamPart.type === "data-sheetDelta") {
      setArtifact((draftArtifact) => ({
        ...draftArtifact,
        content: streamPart.data,
        isVisible: true,
        status: "streaming",
      }));
    }
  },
  content: ({ content, currentVersionIndex, onSaveContent, status }) => {
    return (
      <SpreadsheetEditor
        content={content}
        currentVersionIndex={currentVersionIndex}
        isCurrentVersion={true}
        saveContent={onSaveContent}
        status={status}
      />
    );
  },
  actions: [
    {
      icon: <UndoIcon size={18} />,
      description: "Xem ban truoc",
      onClick: ({ handleVersionChange }) => {
        handleVersionChange("prev");
      },
      isDisabled: ({ currentVersionIndex }) => {
        if (currentVersionIndex === 0) {
          return true;
        }

        return false;
      },
    },
    {
      icon: <RedoIcon size={18} />,
      description: "Xem ban tiep",
      onClick: ({ handleVersionChange }) => {
        handleVersionChange("next");
      },
      isDisabled: ({ isCurrentVersion }) => {
        if (isCurrentVersion) {
          return true;
        }

        return false;
      },
    },
    {
      icon: <CopyIcon />,
      description: "Sao chep .csv",
      onClick: ({ content }) => {
        const parsed = parse<string[]>(content, { skipEmptyLines: true });

        const nonEmptyRows = parsed.data.filter((row) =>
          row.some((cell) => cell.trim() !== "")
        );

        const cleanedCsv = unparse(nonEmptyRows);

        navigator.clipboard.writeText(cleanedCsv);
        toast.success("Da sao chep csv!");
      },
    },
  ],
  toolbar: [
    {
      description: "Lam sach du lieu",
      icon: <SparklesIcon />,
      onClick: ({ sendMessage }) => {
        sendMessage({
          role: "user",
          parts: [
            { type: "text", text: "Hay dinh dang va lam sach du lieu." },
          ],
        });
      },
    },
    {
      description: "Phan tich va ve bieu do",
      icon: <LineChartIcon />,
      onClick: ({ sendMessage }) => {
        sendMessage({
          role: "user",
          parts: [
            {
              type: "text",
              text: "Hay phan tich va ve bieu do bang python.",
            },
          ],
        });
      },
    },
  ],
});

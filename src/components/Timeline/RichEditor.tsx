
import React, { useEffect, useMemo } from 'react';
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useTheme } from "next-themes";
import { driveService } from "@/services/driveService";
import { toast } from "sonner";

interface RichEditorProps {
    initialContent?: string; // JSON string
    onChange?: (content: string) => void;
    editable?: boolean;
    className?: string;
}

export const RichEditor: React.FC<RichEditorProps> = ({
    initialContent,
    onChange,
    editable = true,
    className
}) => {
    const { theme } = useTheme();

    // Parse initial content safely
    const parsedContent = useMemo(() => {
        if (!initialContent) return undefined;
        try {
            return JSON.parse(initialContent);
        } catch (e) {
            console.error("Failed to parse rich content:", e);
            return undefined;
        }
    }, [initialContent]);

    const editor = useCreateBlockNote({
        initialContent: parsedContent,
        uploadFile: async (file) => {
            const toastId = toast.loading("Uploading to Drive...");
            try {
                const result = await driveService.uploadFile(file);
                if (result) {
                    toast.success("Uploaded!", { id: toastId });
                    return result.url;
                } else {
                    toast.error("Upload failed", { id: toastId });
                    // Fallback to local URL if upload fails so user doesn't lose content immediately
                    return URL.createObjectURL(file);
                }
            } catch (error: unknown) {
                console.error("Upload error:", error);
                const errorMessage = error instanceof Error ? error.message : "Unknown error";
                toast.error(`Upload error: ${errorMessage}`, { id: toastId });
                return URL.createObjectURL(file);
            }
        }
    });

    // Handle updates
    // We attach the listener only once or when onChange changes
    // BlockNote's recommended way is `editor.onChange`
    useEffect(() => {
        if (!editor || !onChange) return;

        const handleChange = () => {
            const jsonBlocks = editor.document;
            onChange(JSON.stringify(jsonBlocks));
        };

        // There isn't a direct "onchange" event listener like native DOM, 
        // but we can pass `onEditorContentChange` to BlockNoteView or use pure hooks if available.
        // Actually `useCreateBlockNote` doesn't accept onChange directly in recent versions (check docs if strict),
        // but usually we can listen to it.
        // However, the standard way in React is usually on BlockNoteView or via `onChange` prop in older versions.
        // In 0.15+, `onChange` is on `BlockNoteView`.

    }, [editor, onChange]);

    return (
        <div className={`rich-editor-wrapper ${className || ''}`}>
            <BlockNoteView
                editor={editor}
                editable={editable}
                theme={theme === 'dark' ? 'dark' : 'light'}
                onChange={() => {
                    if (onChange) {
                        onChange(JSON.stringify(editor.document));
                    }
                }}
            />
        </div>
    );
};

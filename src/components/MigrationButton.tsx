import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { migrateLocalDataToSupabase, formatMigrationResult } from '@/utils/dataMigration';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Database, CheckCircle, AlertCircle } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';

export function MigrationButton() {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [isMigrating, setIsMigrating] = useState(false);
    const [result, setResult] = useState<string | null>(null);
    const [isSuccess, setIsSuccess] = useState<boolean | null>(null);

    const handleMigrate = async () => {
        setIsMigrating(true);
        setResult(null);

        try {
            const migrationResult = await migrateLocalDataToSupabase();
            const formattedResult = formatMigrationResult(migrationResult);
            setResult(formattedResult);
            setIsSuccess(migrationResult.success);
        } catch (error: any) {
            setResult(`❌ Migration error: ${error.message}`);
            setIsSuccess(false);
        } finally {
            setIsMigrating(false);
        }
    };

    if (!user) {
        return null; // Don't show migration button if not logged in
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                >
                    <Database className="h-4 w-4" />
                    Sync to Cloud
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Sync Local Data to Cloud</DialogTitle>
                    <DialogDescription>
                        This will upload all your local data (tasks, sessions, sleep entries) to Supabase cloud storage.
                        Your data will be backed up and synced across devices.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {!result && (
                        <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Before you start</AlertTitle>
                            <AlertDescription>
                                Make sure you're connected to the internet. This process may take a few moments depending on how much data you have.
                            </AlertDescription>
                        </Alert>
                    )}

                    {result && (
                        <Alert variant={isSuccess ? "default" : "destructive"}>
                            {isSuccess ? (
                                <CheckCircle className="h-4 w-4" />
                            ) : (
                                <AlertCircle className="h-4 w-4" />
                            )}
                            <AlertTitle>
                                {isSuccess ? 'Migration Complete' : 'Migration Failed'}
                            </AlertTitle>
                            <AlertDescription>
                                <pre className="whitespace-pre-wrap text-xs mt-2 font-mono">
                                    {result}
                                </pre>
                            </AlertDescription>
                        </Alert>
                    )}

                    <div className="flex gap-2">
                        <Button
                            onClick={handleMigrate}
                            disabled={isMigrating}
                            className="flex-1"
                        >
                            {isMigrating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isMigrating ? 'Syncing...' : 'Start Sync'}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setIsOpen(false);
                                setResult(null);
                                setIsSuccess(null);
                            }}
                        >
                            {result ? 'Close' : 'Cancel'}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

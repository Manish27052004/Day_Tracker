import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useStorage } from '@/contexts/StorageContext';
import { Database, HardDrive, LogOut, CheckCircle2 } from 'lucide-react';

export const StorageSettings = () => {
    const { isStorageConnected, storageEmail, connectStorage, disconnectStorage } = useStorage();

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-medium">Storage Connections</h3>
                <p className="text-sm text-muted-foreground">
                    Manage where your rich media (images, videos) is stored.
                </p>
            </div>

            <div className="grid gap-4">
                {/* Main Database (Supabase) - Read Only */}
                <Card>
                    <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                            <Database className="h-5 w-5 text-primary" />
                            <CardTitle className="text-base">Application Data</CardTitle>
                        </div>
                        <CardDescription>
                            Your tasks, sessions, and streaks are stored securely in the cloud.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2 text-sm text-green-500 font-medium">
                            <CheckCircle2 className="h-4 w-4" />
                            Connected (Supabase)
                        </div>
                    </CardContent>
                </Card>

                {/* Secondary Storage (Google Drive) */}
                <Card className={isStorageConnected ? "border-primary/50 bg-primary/5" : ""}>
                    <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                            <HardDrive className="h-5 w-5 text-blue-500" />
                            <CardTitle className="text-base">Media Storage (Google Drive)</CardTitle>
                        </div>
                        <CardDescription>
                            Connect any Google account to store images and heavy files for free.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isStorageConnected ? (
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
                                        <CheckCircle2 className="h-4 w-4" />
                                        Connected
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        Using account: <span className="font-medium text-foreground">{storageEmail || 'Unknown'}</span>
                                    </p>
                                </div>
                                <Button variant="outline" size="sm" onClick={disconnectStorage} className="text-destructive hover:text-destructive">
                                    <LogOut className="h-4 w-4 mr-2" />
                                    Disconnect
                                </Button>
                            </div>
                        ) : (
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <p className="text-sm text-muted-foreground">
                                    No storage connected. Rich media features will be disabled.
                                </p>
                                <Button onClick={connectStorage} variant="default" className="bg-blue-600 hover:bg-blue-700">
                                    <HardDrive className="h-4 w-4 mr-2" />
                                    Connect Google Drive
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

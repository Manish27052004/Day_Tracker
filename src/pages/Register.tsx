import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Chrome, ArrowRight } from 'lucide-react';

const Register = () => {
    const { signInWithGoogle, user } = useAuth();
    const navigate = useNavigate();

    // Redirect if already logged in
    useEffect(() => {
        if (user) {
            navigate('/select-mode');
        }
    }, [user, navigate]);

    const handleGoogleLogin = async () => {
        try {
            await signInWithGoogle('register'); // Pass flow type
        } catch (error) {
            console.error("Registration failed:", error);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-bl from-background via-background/95 to-purple-500/5 p-4 overflow-hidden relative">
            {/* Ambient Background Animations */}
            <motion.div
                className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px]"
                animate={{
                    scale: [1, 1.1, 1],
                    x: [0, -30, 0],
                    y: [0, 50, 0]
                }}
                transition={{ duration: 15, repeat: Infinity, repeatType: "reverse" }}
            />
            <motion.div
                className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px]"
                animate={{
                    scale: [1, 1.2, 1],
                    x: [0, 40, 0],
                    y: [0, -40, 0]
                }}
                transition={{ duration: 12, repeat: Infinity, repeatType: "reverse" }}
            />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="w-full max-w-md relative z-10"
            >
                <Card className="border-border/50 shadow-2xl backdrop-blur-md bg-background/90">
                    <CardHeader className="space-y-1 text-center">
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.2, type: "spring" }}
                        >
                            <CardTitle className="text-3xl font-bold tracking-tight bg-gradient-to-br from-purple-600 to-blue-600 bg-clip-text text-transparent">
                                Create an Account
                            </CardTitle>
                            <CardDescription className="text-muted-foreground mt-2">
                                Join us to track your day and manage attendance effortlessly
                            </CardDescription>
                        </motion.div>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                        <motion.div
                            initial={{ x: 20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.3 }}
                        >
                            <div className="bg-primary/5 p-4 rounded-lg mb-4 text-sm text-muted-foreground border border-primary/10">
                                <h4 className="font-semibold text-foreground mb-1 flex items-center gap-2">
                                    Why Sign Up?
                                </h4>
                                <ul className="list-disc list-inside space-y-1 ml-1 opacity-90">
                                    <li>Sync your data across devices</li>
                                    <li>Track recurring tasks & streaks</li>
                                    <li>Manage attendance seamlessly</li>
                                </ul>
                            </div>

                            <Button
                                className="w-full h-12 text-base font-medium shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all duration-300"
                                onClick={handleGoogleLogin}
                            >
                                <Chrome className="mr-2 h-5 w-5" />
                                Sign up with Google
                                <ArrowRight className="ml-2 h-4 w-4 opacity-50" />
                            </Button>
                        </motion.div>

                        <motion.div
                            className="relative"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.4 }}
                        >
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-border/50" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-background px-2 text-muted-foreground">
                                    Already a member?
                                </span>
                            </div>
                        </motion.div>

                        <motion.div
                            className="text-center"
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.5 }}
                        >
                            <Link to="/login">
                                <Button variant="link" className="text-primary hover:text-primary/80 font-semibold">
                                    Log in to your account
                                </Button>
                            </Link>
                        </motion.div>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
};

export default Register;

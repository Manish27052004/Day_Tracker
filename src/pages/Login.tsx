import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Chrome } from 'lucide-react';

const Login = () => {
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
            await signInWithGoogle('login'); // Pass flow type
        } catch (error) {
            console.error("Login failed:", error);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-background via-background/95 to-primary/5 p-4 overflow-hidden relative">
            {/* Ambient Background Animations */}
            <motion.div
                className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-primary/10 rounded-full blur-[100px]"
                animate={{
                    scale: [1, 1.2, 1],
                    x: [0, 50, 0],
                    y: [0, 30, 0]
                }}
                transition={{ duration: 10, repeat: Infinity, repeatType: "reverse" }}
            />
            <motion.div
                className="absolute bottom-[-20%] right-[-10%] w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[100px]"
                animate={{
                    scale: [1, 1.3, 1],
                    x: [0, -40, 0],
                    y: [0, -40, 0]
                }}
                transition={{ duration: 12, repeat: Infinity, repeatType: "reverse" }}
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="w-full max-w-md relative z-10"
            >
                <Card className="border-border/50 shadow-xl backdrop-blur-sm bg-background/80">
                    <CardHeader className="space-y-1 text-center">
                        <motion.div
                            initial={{ y: -20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                        >
                            <CardTitle className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                                Welcome Back
                            </CardTitle>
                            <CardDescription className="text-muted-foreground mt-2">
                                Sign in to continue to your dashboard
                            </CardDescription>
                        </motion.div>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                        <motion.div
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.3 }}
                        >
                            <Button
                                variant="outline"
                                className="w-full h-12 text-base font-medium transition-all hover:bg-primary/5 hover:border-primary/50 group relative overflow-hidden"
                                onClick={handleGoogleLogin}
                            >
                                <motion.span
                                    className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-primary/5 to-transparent"
                                    initial={{ x: '-100%' }}
                                    whileHover={{ x: '100%' }}
                                    transition={{ duration: 0.5 }}
                                />
                                <Chrome className="mr-2 h-5 w-5 transition-transform group-hover:scale-110" />
                                Continue with Google
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
                                    Or
                                </span>
                            </div>
                        </motion.div>

                        <motion.div
                            className="text-center text-sm text-muted-foreground"
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.5 }}
                        >
                            Don't have an account?{" "}
                            <Link to="/register" className="font-semibold text-primary hover:underline hover:text-primary/80 transition-colors">
                                Sign up
                            </Link>
                        </motion.div>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-2 text-center text-xs text-muted-foreground">
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.6 }}
                        >
                            By clicking continue, you agree to our <span className="hover:text-primary cursor-pointer">Terms of Service</span> and <span className="hover:text-primary cursor-pointer">Privacy Policy</span>.
                        </motion.p>
                    </CardFooter>
                </Card>
            </motion.div>
        </div>
    );
};

export default Login;

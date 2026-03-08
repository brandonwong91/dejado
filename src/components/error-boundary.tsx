'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

interface Props {
    children?: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    errorMessage?: string;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, errorMessage: error.message };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }
            return (
                <Alert variant='destructive' className='my-4'>
                    <AlertCircle className='h-4 w-4' />
                    <AlertTitle>Component Error</AlertTitle>
                    <AlertDescription className='mt-2'>
                        <p className='mb-2 text-sm'>
                            {this.state.errorMessage?.includes('cannot_render_billing_disabled')
                                ? 'Clerk Billing is not enabled for this organization. Please enable it in the Clerk Dashboard to view pricing tables.'
                                : 'Something went wrong rendering this component.'}
                        </p>
                        <Button
                            variant='outline'
                            size='sm'
                            onClick={() => this.setState({ hasError: false })}
                        >
                            Try again
                        </Button>
                    </AlertDescription>
                </Alert>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;

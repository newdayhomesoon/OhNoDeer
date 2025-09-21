import React, {Component, ErrorInfo, ReactNode} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, Alert} from 'react-native';
import theme from '../../src/app-theme';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {hasError: true, error};
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });

    // Log the error for debugging
    this.logErrorDetails(error, errorInfo);
  }

  private logErrorDetails = (error: Error, errorInfo: ErrorInfo) => {
    const errorDetails = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
    };

    console.error(
      'Detailed error information:',
      JSON.stringify(errorDetails, null, 2)
    );

    // You could send this to a crash reporting service
    // crashlytics().recordError(error);
  };

  private handleRestart = () => {
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
    });
  };

  private handleShowDetails = () => {
    if (this.state.error) {
      // Safely format the error message and stack
      const errorMessage = this.state.error.message || 'Unknown error';
      const errorStack = this.state.error.stack || 'No stack trace available';

      // Clean the stack trace to avoid text rendering issues
      const cleanStack = errorStack
        .replace(/\s+/g, ' ')
        .replace(/[^\x20-\x7E]/g, '')
        .substring(0, 300);

      Alert.alert(
        'Error Details',
        `${errorMessage}\n\nStack: ${cleanStack}...`,
        [
          {
            text: 'Copy to Clipboard',
            onPress: () => {
              console.log('Error details copied to clipboard');
              console.log(`Error: ${errorMessage}`);
              console.log(`Stack: ${errorStack}`);
            },
          },
          {text: 'OK'},
        ],
      );
    }
  };

  public render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View style={styles.container}>
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>Something went wrong</Text>
            <Text style={styles.errorMessage}>
              The app encountered an unexpected error. This is usually
              temporary.
            </Text>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.restartButton}
                onPress={this.handleRestart}>
                <Text style={styles.restartButtonText}>Try Again</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.detailsButton}
                onPress={this.handleShowDetails}>
                <Text style={styles.detailsButtonText}>Show Details</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.helpText}>
              If this problem persists, please restart the app completely.
            </Text>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.primaryBackground,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.m,
  },
  errorContainer: {
    backgroundColor: theme.colors.secondaryBackground,
    borderRadius: 16,
    padding: theme.spacing.xl,
    alignItems: 'center',
    maxWidth: 350,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  errorTitle: {
    fontSize: theme.fontSize.h2,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.m,
    textAlign: 'center',
    fontFamily: theme.fontFamily.lato,
  },
  errorMessage: {
    fontSize: theme.fontSize.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: theme.spacing.xl,
    fontFamily: theme.fontFamily.openSans,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: theme.spacing.m,
  },
  restartButton: {
    backgroundColor: theme.colors.accent,
    paddingVertical: theme.spacing.m,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: 25,
    flex: 1,
    marginRight: theme.spacing.s,
  },
  restartButtonText: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.body,
    fontWeight: '600',
    textAlign: 'center',
    fontFamily: theme.fontFamily.openSans,
  },
  detailsButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: theme.spacing.m,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: 25,
    flex: 1,
    marginLeft: theme.spacing.s,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  detailsButtonText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.body,
    fontWeight: '600',
    textAlign: 'center',
    fontFamily: theme.fontFamily.openSans,
  },
  helpText: {
    fontSize: theme.fontSize.caption,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    fontFamily: theme.fontFamily.openSans,
  },
});

export default ErrorBoundary;

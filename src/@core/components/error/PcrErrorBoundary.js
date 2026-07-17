// ** React Imports
import { Component } from 'react'

// ** MUI Imports
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'

class PcrErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('PCR ErrorBoundary:', error, info)
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            minHeight: 320,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            p: 6
          }}
        >
          <Typography variant='h5' sx={{ mb: 2 }}>
            Something went wrong
          </Typography>
          <Typography variant='body2' sx={{ color: 'text.secondary', mb: 4, maxWidth: 480 }}>
            {this.state.error?.message ??
              'An unexpected error occurred while rendering this page. You can retry or return to the dashboard.'}
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button variant='contained' onClick={this.handleRetry}>
              Retry
            </Button>
            <Button variant='tonal' href='/dashboard'>
              Go to Dashboard
            </Button>
          </Box>
        </Box>
      )
    }

    return this.props.children
  }
}

export default PcrErrorBoundary

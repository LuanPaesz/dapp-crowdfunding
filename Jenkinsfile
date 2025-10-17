pipeline {
  agent any

  tools { nodejs 'Node22' }

  options {
    timestamps()
    skipDefaultCheckout(false)
  }

  stages {
    stage('Checkout') {
      steps { checkout scm }
    }

    stage('Install deps') {
      steps {
        ansiColor('xterm') {
          dir('smart-contract') { sh 'npm ci' }
          dir('frontend')       { sh 'npm ci' }
        }
      }
    }

    stage('Lint & Typecheck') {
      steps {
        ansiColor('xterm') {
          dir('smart-contract') { sh 'npm run lint:ci || true' }
          dir('frontend') {
            sh 'npm run typecheck || true'
            sh 'npm run lint:ci || true'
          }
        }
      }
      post {
        always {
          // Warnings NG (Checkstyle)
          recordIssues enabledForFailure: true, tool: checkStyle(pattern: 'frontend/reports/eslint.xml')
          recordIssues enabledForFailure: true, tool: checkStyle(pattern: 'smart-contract/reports/solhint.xml')
        }
      }
    }

    stage('Contracts: Compile & Test') {
      steps {
        ansiColor('xterm') {
          dir('smart-contract') {
            sh 'npm run compile'
            sh 'npm test || true'               // saída no console
            sh 'npm run test:node-junit || true'// JUnit XML
          }
        }
      }
      post {
        always {
          junit allowEmptyResults: true, testResults: 'smart-contract/reports/*.xml'
        }
      }
    }

    stage('Frontend: Build') {
      steps {
        ansiColor('xterm') {
          dir('frontend') { sh 'npm run build' }
        }
      }
      post {
        always {
          archiveArtifacts artifacts: 'frontend/dist/**', fingerprint: true
        }
      }
    }
  }

  post {
    always { echo 'Pipeline finished.' }
    failure { echo "Build FAILED — check Test Results and Warnings." }
  }
}

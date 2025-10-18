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
          script {
            // ESLint (frontend) — ID único
            if (fileExists('frontend/reports/eslint.xml')) {
              recordIssues(
                id: 'eslint',
                enabledForFailure: true,
                tool: checkStyle(pattern: 'frontend/reports/eslint.xml'),
                publishChecks: false
              )
            } else {
              echo 'ESLint report not found (frontend/reports/eslint.xml) — skipping.'
            }

            // Solhint (smart-contract) — ID único
            if (fileExists('smart-contract/reports/solhint.xml')) {
              recordIssues(
                id: 'solhint',
                enabledForFailure: true,
                tool: checkStyle(pattern: 'smart-contract/reports/solhint.xml'),
                publishChecks: false
              )
            } else {
              echo 'Solhint report not found (smart-contract/reports/solhint.xml) — skipping.'
            }
          }
        }
      }
    }

    stage('Contracts: Compile & Test') {
      steps {
        ansiColor('xterm') {
          dir('smart-contract') {
            sh 'npm run compile'
            sh 'npm test || true'                // loga testes do hardhat
            sh 'npm run test:node-junit || true' // gera JUnit XML em reports/
          }
        }
      }
      post {
        always {
          script {
            // Publica JUnit apenas se houver relatórios
            def hasReports = fileExists('smart-contract/reports') &&
                             sh(returnStatus: true, script: "ls smart-contract/reports/*.xml 1>/dev/null 2>&1") == 0

            if (hasReports) {
              junit testResults: 'smart-contract/reports/*.xml',
                    allowEmptyResults: true,
                    skipPublishingChecks: true
            } else {
              echo 'No JUnit XML found (smart-contract/reports/*.xml) — skipping publisher.'
            }
          }
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
    failure { echo 'Build FAILED — check Test Results and Warnings.' }
  }
}

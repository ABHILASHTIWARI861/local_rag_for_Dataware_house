/**
 * Halden Logistics - Retrieval & Grounding Evaluation Script
 * 
 * Tests whether:
 * 1. The local vector search retrieves the correct document & passage.
 * 2. The assistant answers accurately with citations.
 * 3. The assistant correctly refuses to answer out-of-scope questions.
 */

// Base URL for the Express API
const API_BASE = process.env.API_BASE || 'http://localhost:5000/api';

// Realistic evaluation test cases
const testCases = [
  {
    name: 'Forklift Speed Limit (Safety Procedure)',
    question: 'What is the maximum speed limit for forklifts inside the warehouse?',
    expectedDoc: 'warehouse_safety.md', // Expecting answer from safety procedure
    expectedKeyword: '8 km/h',           // Must mention 8 km/h
    shouldAnswer: true                   // Expected to answer
  },
  {
    name: 'Battery Charging Protocol (Runbook)',
    question: 'Where must electric forklifts be charged and what is the battery temperature limit?',
    expectedDoc: 'forklift_runbook.txt', // Expecting answer from equipment runbook
    expectedKeyword: '45°C',              // Must mention 45°C
    shouldAnswer: true                   // Expected to answer
  },
  {
    name: 'Absence Reporting Deadline (HR Policy)',
    question: 'How many hours in advance must an employee call the hotline to report a sick absence?',
    expectedDoc: 'hr_policies.txt',     // Expecting answer from HR policy
    expectedKeyword: '2 hours',          // Must mention 2 hours
    shouldAnswer: true                   // Expected to answer
  },
  {
    name: 'Out of Scope Refusal Test',
    question: 'What is the CEO personal home address and private mobile phone number?',
    expectedDoc: null,
    expectedKeyword: null,
    shouldAnswer: false                  // MUST refuse to answer because it is not in the docs
  }
];

// Run all test cases in sequence
async function runEvaluation() {
  console.log('====================================================');
  console.log('  Halden Logistics RAG Assistant - Accuracy Test');
  console.log('====================================================\n');

  let passedTests = 0;

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    console.log(`[Test ${i + 1}/${testCases.length}] ${tc.name}`);
    console.log(`Question: "${tc.question}"`);

    try {
      // Send question to /api/query endpoint
      const response = await fetch(`${API_BASE}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: tc.question })
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const result = await response.json();
      const topSource = result.sources?.[0];

      if (tc.shouldAnswer) {
        // Check if top retrieved passage came from the expected document
        const matchedDoc = topSource && topSource.documentName.toLowerCase().includes(tc.expectedDoc.toLowerCase().replace(/\.[^.]+$/, ''));
        // Check if expected keyword appears in the answer or passage
        const foundKeyword = result.answer.includes(tc.expectedKeyword) || topSource?.passage?.includes(tc.expectedKeyword);

        if (matchedDoc && foundKeyword) {
          console.log(` Status: PASS`);
          console.log(`   - Retrieved Doc: ${topSource.documentName} (Similarity: ${(topSource.similarity * 100).toFixed(1)}%)`);
          console.log(`   - Answer: ${result.answer.split('\n')[0]}`);
          passedTests++;
        } else {
          console.log(` Status: FAIL`);
          console.log(`   - Expected Doc: ${tc.expectedDoc}, got: ${topSource?.documentName}`);
          console.log(`   - Answer: ${result.answer}`);
        }
      } else {
        // Verify refusal behavior on out-of-scope question
        const isRefusal = result.answer.toLowerCase().includes('cannot find') ||
                          result.answer.toLowerCase().includes('not mentioned') ||
                          result.answer.toLowerCase().includes('no information');

        if (isRefusal) {
          console.log(` Status: PASS (Correctly refused out-of-scope question)`);
          console.log(`   - Response: "${result.answer.trim()}"`);
          passedTests++;
        } else {
          console.log(` Status: FAIL (Did not refuse out-of-scope question)`);
          console.log(`   - Response: "${result.answer}"`);
        }
      }
    } catch (err) {
      console.log(` Status: ERROR (${err.message})`);
    }

    console.log('----------------------------------------------------');
  }

  // Calculate and print overall accuracy percentage
  const accuracy = ((passedTests / testCases.length) * 100).toFixed(0);
  console.log(`\nEvaluation Summary: ${passedTests}/${testCases.length} Passed (${accuracy}% Retrieval & Grounding Accuracy)\n`);
}

// Start evaluation run
runEvaluation();

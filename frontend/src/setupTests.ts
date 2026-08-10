// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Global mocks for API services used by pages. Keeps tests deterministic
// and avoids importing real network code during Jest runs.
jest.mock('./services/api', () => {
	const noopAsync = async (..._args: any[]) => ({});

	return {
		authAPI: {
			login: async () => ({ token: 'test-token', user: { email: 'test@example.com' } }),
			register: noopAsync,
			logout: noopAsync,
			getMe: async () => ({ email: 'test@example.com', role: 'user' }),
			forgotPassword: noopAsync,
			resetPassword: noopAsync,
			verifyEmail: noopAsync,
		},
		profileAPI: {
			getProfile: async () => ({ email: 'test@example.com' }),
			updateProfile: noopAsync,
			changePassword: noopAsync,
			deactivateAccount: noopAsync,
			getAllUsers: async () => ({ users: [] }),
			getUserById: noopAsync,
			updateUserRole: noopAsync,
			toggleUserStatus: noopAsync,
			getSystemStats: async () => ({}),
			getActivityLog: async () => ({ logs: [] }),
		},
		policyAPI: {
			searchPolicies: async () => ({ policies: [] }),
			comparePolicies: async () => ({ result: [] }),
			getPolicyById: async (policyId: string) => ({ id: policyId, name: 'Test Policy' }),
		},
		purchaseAPI: {
			initiate: async () => ({ purchaseId: 'p1' }),
			complete: async () => ({}),
			get: async () => ({ purchase: {} }),
			getUserPurchases: async () => ({ purchases: [] }),
			download: async () => new Blob(),
			createTestPurchase: async () => ({ purchaseId: 'test' }),
		},
		claimAPI: {
			submit: async () => ({ claimId: 'c1' }),
			getUserClaims: async () => ({ claims: [] }),
			getClaimById: async () => ({ claim: {} }),
			adminGetClaims: async () => ({ claims: [] }),
			adminUpdateStatus: async () => ({ updated: true }),
		},
		renewalAPI: {
			checkEligibility: async () => ({ eligible: true }),
			initiateRenewal: async () => ({ renewalId: 'r1' }),
			getRenewalStatus: async () => ({ status: 'pending' }),
			getMyRenewals: async () => ({ renewals: [] }),
		},
		__esModule: true,
	};
});

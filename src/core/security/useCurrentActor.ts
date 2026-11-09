import { useAuthStore } from "@/core/security/authStore";

export const useCurrentActor = () => {
	const user = useAuthStore((state) => state.user);

	return {
		currentActorRole: user?.role,
		entityContext: user?.entityContext,
		currentPermissions: user?.permissions,
	};
};


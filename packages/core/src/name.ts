const NAME = /^[\p{L}\p{Mn}\p{Nd}\p{Pc}-]+$/u;

export const MAX_NAME = 50;

export const nameProblems = (name: string): ReadonlyArray<string> => [
	...(NAME.test(name) ? [] : ['must use only letters, digits, "_" or "-"']),
	...(name.length > MAX_NAME ? [`is longer than ${MAX_NAME} characters`] : []),
];

export const nameFailure = (name: string): string | undefined => {
	const problems = nameProblems(name);
	return problems.length === 0 ? undefined : `The name "${name}" ${problems.join(" and ")}`;
};

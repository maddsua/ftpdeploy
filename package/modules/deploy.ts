
export const getDeployAssets = (deployRoot: string) => {

	const entries: string[] = [];

	const listDirectory = (path: string) => {

		const listResult = Array.from(Deno.readDirSync(path));

		for (let item of listResult) {

			const itemPath = `${path}/${item.name}`;

			if (item.isFile) {
				entries.push(itemPath);
			} else if (item.isDirectory) {
				listDirectory(itemPath);
			}
		}
	};

	listDirectory(deployRoot);

	return entries;
};

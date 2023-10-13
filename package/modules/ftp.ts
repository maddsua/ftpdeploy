import { FTPClient } from "https://deno.land/x/ftpc@v2.0.1/mod.ts";
import { posix as path } from "https://deno.land/std@0.203.0/path/mod.ts";

export const dirExist = async (ftp: FTPClient, dirPath: string) => {
	try {
		const oldPath = await ftp.cwd();
		await ftp.chdir(path.normalize(dirPath));
		await ftp.chdir(oldPath);
		return true;
	} catch (_error) {
		return false;
	}
};

export const mkDirRecursive = async (ftp: FTPClient, dirPath: string) => {

	if (!/^[\\\/]/.test(dirPath)) throw new Error('Path must be absolute');

	const pathSegments = path.normalize(dirPath).replace(/^\//, '').split('/');
	const oldPath = await ftp.cwd();

	let constructedPath = '';

	try {

		for (let segment of pathSegments) {

			constructedPath += `/${segment}`;
	
			const exist = await dirExist(ftp, constructedPath);
			if (!exist) await ftp.mkdir(segment);
			await ftp.chdir(constructedPath);
		}

	} catch (error) {
		
		try {
			await ftp.chdir(oldPath);
		} catch (cd_error) {
			console.error('Could not respore cwd:', cd_error);
		}

		throw error;
	}

	await ftp.chdir(oldPath);

	return true;
};

export const rmRecursive = async (ftp: FTPClient, dirPath: string) => {

	const iterate = async (rmpath: string) => {

		if (!rmpath.length) return;

		console.log('Deleting:', rmpath);

		const { isDirectory } = await ftp.stat(rmpath);

		if (isDirectory) {

			const contents = await ftp.list(rmpath);
			//	I'd really like to shove this \.. entries up the...of the person that put it into listing
			const actualyContents = contents.filter(item => !/[\\\/]\.{1,2}$/.test(item));
	
			for (let entry of actualyContents) {
				await iterate(entry);
			}

			await ftp.rmdir(rmpath);
		}

		else await ftp.rm(rmpath);

	};
	await iterate(dirPath);
};

export const getTextFile = async (ftp: FTPClient, filePath: string) => {
	try {
		return new TextDecoder().decode(await ftp.download(filePath));
	} catch (_error) {
		return null;
	}
};

export const putTextFile = async (ftp: FTPClient, filePath: string, content: string) => {
	try {
		await ftp.upload(filePath, new TextEncoder().encode(content));
	} catch (_error) {
		return null;
	}
};

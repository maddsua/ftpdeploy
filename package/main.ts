import { FTPClient } from 'https://deno.land/x/ftpc@v2.0.1/mod.ts';
import { posix as path } from 'https://deno.land/std@0.203.0/path/mod.ts';
import 'https://deno.land/std@0.201.0/dotenv/load.ts';

import { getDeployAssets } from './modules/deploy.ts';
import { getLastCommitHash } from './modules/git.ts';
import { dirExist, getTextFile, mkDirRecursive, putTextFile, rmRecursive } from './modules/ftp.ts';
import { getArg } from './modules/cli-args.ts';


/**
 * Deployment script setup
 */

const deploySettings = {
	project_dist: Deno.env.get('FTP_DEPLOY_DIST') || getArg('distDir') || './dist',
	ftp_deploys: Deno.env.get('FTP_DEPLOY_FOLDER') || getArg('deploysFolder') || '/ftpdeploy/deploys',
	ftp_www_prod: Deno.env.get('FTP_DEPLOY_WWW_PROD') || getArg('wwwProd') || '/web/www'
};

const ftpCreds = {
	host: Deno.env.get('FTP_DEPLOY_HOST') || getArg('host') as string,
	user: Deno.env.get('FTP_DEPLOY_USER') || getArg('user') as string,
	pw: Deno.env.get('FTP_DEPLOY_PASSWORD') || getArg('password') as string,
};

for (let key in ftpCreds) {
	const value = ftpCreds[key as keyof typeof ftpCreds];
	if (!value) throw new Error(`Could not retrieve "${key}" value from env.`);
	else if (value.startsWith('$')) throw new Error(`Expected a secret for "${key}" but got a variable reference`);
}

const ciEnvCommitHash = Deno.env.get('CI_COMMIT_SHA') || Deno.env.get('GITHUB_SHA');
const deployID = (ciEnvCommitHash || await getLastCommitHash())?.slice(0, 8);
if (!deployID) throw new Error('Could not get deployID');

console.log(`Deploying from ${deploySettings.project_dist}`);
console.log(`Deploy id: ${deployID}`);
console.log(`Deploy stash: ${deploySettings.ftp_deploys}`);
console.log(`Production directory: ${deploySettings.ftp_www_prod}`);


/**
 * Establish FTP connection
 */

const ftpClient = new FTPClient(ftpCreds.host, {
	user: ftpCreds.user,
	pass: ftpCreds.pw
});

await ftpClient.connect();
console.log(`FTP client: connected as ${ftpCreds.user}@${ftpCreds.host}`);


/**
 * Create an empty directory to store new assets
 */

const newDeployDir = path.normalize(`${deploySettings.ftp_deploys}/${deployID}`);
const deployDirExist = await dirExist(ftpClient, newDeployDir);

if (deployDirExist) {
	console.warn('Deploy directory already exist, clearing...');
	await rmRecursive(ftpClient, newDeployDir);
}

await mkDirRecursive(ftpClient, newDeployDir);


/**
 *	Undex deploy assets to be uploaded
 */

console.log('Indexing assets...');
const assets = getDeployAssets(deploySettings.project_dist);
console.log(`Total of ${assets.length} files`);

//	perform basic checks on assets
if (!assets.length)
	throw new Error(`No assets loaded from: ${deploySettings.project_dist}`);
if (!assets.some(item => /\.html?/i.test(item)))
	throw new Error(`No assets html files found in: ${deploySettings.project_dist}. Are you sure that's right?`);


/**
 * Upload static assets
 */

let uploadedFilesCounter = 0;
for (let assetPath of assets) {

	const srcPath = assetPath;
	const baseName = assetPath.slice(deploySettings.project_dist.length);
	const destPath = path.normalize(`${newDeployDir}/${baseName}`);
	const destDir = path.dirname(destPath);

	uploadedFilesCounter++;
	console.log(`Uploading [${uploadedFilesCounter}/${assets.length}]: ${baseName}`);

	if (!await dirExist(ftpClient, destDir))
		await mkDirRecursive(ftpClient, destDir);

	const uploadStream = await ftpClient.uploadStream(destPath);
	const srcFile = await Deno.open(srcPath);
	await srcFile.readable.pipeTo(uploadStream.writable);
	ftpClient.finalizeStream();
}


/**
 * replace current production directory with new deploy
 */

interface DeployCtx {
	id: string;
	date: string;
};

console.log('Preparing to push...');

const deployIndexFilePath = path.normalize(`${deploySettings.ftp_deploys}/index.json`);
const deployIndexFileText = await getTextFile(ftpClient, deployIndexFilePath);
const deployIndex: DeployCtx[] = deployIndexFileText ? JSON.parse(deployIndexFileText) : [];

if (await dirExist(ftpClient, deploySettings.ftp_www_prod)) {

	const lastDeploy = deployIndex.at(deployIndex.length - 1);
	if (lastDeploy) {
		console.log(`Stashing production deploy ${lastDeploy.id}...`);
	}
	else {
		console.log('Could not determine last deploy id. Gonna use default stash location...');
	}

	const lastDeployPath = `${deploySettings.ftp_deploys}/${lastDeploy?.id || 'stash'}`;

	if (await dirExist(ftpClient, lastDeployPath)) {
		console.log('Stash location is not empty, clearing...')
		await rmRecursive(ftpClient, lastDeployPath);
	}

	await ftpClient.rename(deploySettings.ftp_www_prod, lastDeployPath);

}
else {
	console.log('Production directory does not exist yet and will be created');
}

console.log(`Promoting ${deployID} to production...`);
await ftpClient.rename(newDeployDir, deploySettings.ftp_www_prod);

/**
 * Finish the job
 */

console.log('Saving index...');
deployIndex.push({
	id: deployID,
	date: new Date().toISOString()
});

await putTextFile(ftpClient, deployIndexFilePath, JSON.stringify(deployIndex));

await ftpClient.close();

console.log('Deploy done! ✨');

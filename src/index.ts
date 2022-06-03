import chalk from 'chalk';
import cors from 'cors';
import { app, BrowserWindow, dialog } from 'electron';
import express from 'express';
import fs from 'fs';
// This allows TypeScript to pick up the magic constant that's auto-generated by Forge's Webpack
// plugin that tells the Electron app where to look for the Webpack-bundled app code (depending on
// whether you're running in development or production).
declare const MAIN_WINDOW_WEBPACK_ENTRY: string;

const log = console.log;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
	// eslint-disable-line global-require
	app.quit();
}

let mainWindow: BrowserWindow;

const createWindow = (): void => {
	// Create the browser window.
	mainWindow = new BrowserWindow({
		height: 600,
		width: 800,
	});

	// and load the index.html of the app.
	mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') {
		app.quit();
	}
});

app.on('activate', () => {
	// On OS X it's common to re-create a window in the app when the
	// dock icon is clicked and there are no other windows open.
	if (BrowserWindow.getAllWindows().length === 0) {
		createWindow();
	}
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.

type Field = {
	x: number;
	y: number;
	name: string;
	selected: boolean;
	highlighted: boolean;
	id: number;
	size: number;
};

const server = express();

server.use(cors());

server.post('/save', async (req, res) => {
	const { fields: f, fieldindex: fi, filepath: fn } = req.headers;
	const fields: Field = JSON.parse(Array.isArray(f) ? f[0] : f);
	const fieldIndex: number = parseInt(Array.isArray(fi) ? fi[0] : fi);
	let filePath: string = Array.isArray(fn) ? fn[0] : fn;
	log(fields, fieldIndex, filePath);

	if (!filePath) {
		filePath = await dialog.showSaveDialogSync(mainWindow, {
			buttonLabel: 'Save',
			title: 'Save GUI',
			filters: [
				{
					extensions: ['mcgui'],
					name: 'McGUI file',
				},
			],
			properties: ['showOverwriteConfirmation'],
		});
	}

	await fs.writeFileSync(
		filePath,
		JSON.stringify({
			fieldIndex: fieldIndex,
			fields: fields,
		}),
	);

	res.status(200).json(filePath);

	console.log('WRITTEN FILE!');
});

server.get('/open', async (req, res) => {
	const filePath = await dialog.showOpenDialogSync(mainWindow, {
		buttonLabel: 'Open',
		title: 'Open a GUI',
		filters: [
			{
				extensions: ['mcgui'],
				name: 'McGUI file',
			},
		],
		properties: ['openFile'],
	});

	const content = await fs.readFileSync(filePath[0], { encoding: 'utf8' });

	const parsedContent: {
		fieldIndex: number;
		fields: Field[];
	} = JSON.parse(content);

	res.status(200).json({ ...parsedContent, filePath: filePath[0] });
});

server.listen(736, () => {
	log(chalk.green('[SERVER]: Listening on port 736!'));
});

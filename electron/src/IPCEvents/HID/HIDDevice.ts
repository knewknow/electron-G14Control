/** @format */

import * as hid from 'node-hid';
import Shell from 'node-powershell';
import getLogger from '../../Logger';
import {
	ASUSACCI_PATH,
	ARMSOCK_SERV,
	ARMSOCK_SERV_PATH,
	ARMCRATE_INTERFACE,
	ARMCRATE_KEY_CTRL,
	ARMORY_SW_AGENT,
	ARMORY_SW_AGENT_PATH,
	ARMCRATE_SVC,
	ARMCRATE_SVC_PATH,
	ARMCRATE_SESS_HELPER,
	ARMCRATE_MANAGER,
	ARMCRATE_MANAGER_AGENT,
} from './constants';

const LOGGER = getLogger('HIDControl');

export const checkExecutableAtPathExists = (name: string, path: string) => {
	return new Promise((resolve) => {
		let ps = new Shell({
			executionPolicy: 'Bypass',
			noProfile: true,
		});
		ps.addCommand(`Test-Path "${path}/${name}" -PathType Leaf`);
		ps.invoke()
			.then((result) => {
				ps.dispose();
				if (result.indexOf('False') !== -1) {
					LOGGER.info(`Did not find file ${name} at path: "${path}"`);
					resolve(false);
				} else {
					LOGGER.info(`Found file ${name} at path: "${path}"`);
					resolve(true);
				}
			})
			.catch((err) => {
				ps.dispose();
				LOGGER.info('Error checking path exists: ' + err);
				resolve(false);
			});
	});
};

export const checkRemoveAndRename = (name: string, path?: string) => {
	return new Promise((resolve) => {
		if (path) {
			checkExecutableAtPathExists(name, path).then((ok) => {
				if (ok) {
					renameProcess(name, name + '_disabled', path).then(() => {
						checkProcessExist(name).then((result) => {
							if (result) {
								killProcess(name).then(() => {
									resolve(true);
								});
							} else {
								resolve(true);
							}
						});
					});
				} else {
					LOGGER.info(
						`${name} at "${path}" has already been renamed to name.exe_disabled or does not exist.`
					);
					checkProcessExist(name).then((result) => {
						if (result) {
							killProcess(name).then(() => {
								resolve(true);
							});
						} else {
							resolve(true);
						}
					});
				}
			});
		} else {
			checkProcessExist(name).then((result) => {
				if (result) {
					killProcess(name).then(() => {
						resolve(true);
					});
				} else {
					resolve(true);
				}
			});
		}
	});
};

export const checkProcessExist = async (executableName: string) => {
	return new Promise((resolve) => {
		let ps = new Shell({
			executionPolicy: 'Bypass',
			noProfile: true,
		});
		ps.addCommand(
			`Get-Process | Where-Object Name -like "${executableName.replace(
				'.exe',
				''
			)}" | Select-Object ProcessName`
		);
		ps.invoke()
			.then((result) => {
				ps.dispose();
				if (result.length > 0) {
					LOGGER.info(
						`Result of checkProcessExists(): Process ${executableName} is running!`
					);
					resolve(true);
				} else {
					LOGGER.info(
						`Result of checkProcessExists(): Process ${executableName} is not running.`
					);
					resolve(false);
				}
			})
			.catch((err) => {
				LOGGER.error(
					`Error checking process named: ${executableName}, had error: \n${err}`
				);
				ps.dispose();
				resolve(false);
			});
	});
};

export const killProcess = async (executablename: string) => {
	let ps = new Shell({
		executionPolicy: 'Bypass',
		noProfile: true,
	});
	return new Promise((resolve) => {
		ps.addCommand(`taskkill /F /IM ${executablename}`);
		ps.invoke()
			.then((success) => {
				ps.dispose();
				if (success) {
					LOGGER.info(
						'Successully killed process with message: ' +
							success.replace('\n', '')
					);
					resolve(true);
				} else {
					LOGGER.error(
						'Failed to kill process (or something idk but no error):\n' +
							success
					);
					resolve(true);
				}
			})
			.catch((error) => {
				LOGGER.error('Failed to kill process. Error:\n' + error);
				ps.dispose();
				resolve(false);
			});
	});
};

export const renameProcess = async (
	executableName: string,
	newName: string,
	path = ASUSACCI_PATH
) => {
	let ps = new Shell({
		executionPolicy: 'Bypass',
		noProfile: true,
	});
	return new Promise((resolve) => {
		ps.addCommand(`ren "${path}/${executableName}" ${newName}`);
		ps.invoke()
			.then((result) => {
				ps.dispose();
				if (result) {
					LOGGER.info('Failed to rename process (or something idk):' + result);
					resolve(true);
				} else {
					LOGGER.info(
						'Successfully renamed ' + executableName + ' to ' + newName
					);
					LOGGER.info(
						'Will now check that execuatable path expected exists...'
					);
					checkExecutableAtPathExists(newName, path).then((result) => {
						if (result) {
							resolve(true);
						} else {
							resolve(false);
						}
					});
				}
			})
			.catch((error) => {
				ps.dispose();
				LOGGER.error('Failed to rename process. Error:\n' + error);
				resolve(false);
			});
	});
};

// Remaps the key to listen to whatever callback it is given.
export const setUpNewG14ControlKey = (
	cb: (data: Buffer) => any,
	main?: boolean
) => {
	let hidDevice: hid.HID;
	let devices = hid.devices();
	let deviceInfo = devices.find(function (d: hid.Device) {
		let kbd = d.vendorId === 0x0b05 && d.productId === 0x1866;
		return kbd && d.path.includes('col01');
	});
	if (deviceInfo) {
		LOGGER.info('Found G14 unique key'); // I'm not sure what it does, but i suppose it searches for Asus specific 'hidden' kb? Change message if that's not the case
		hidDevice = new hid.HID(deviceInfo.path);
		hidDevice.on('data', cb);
		return hidDevice;
	} else {
		return false;
	}
};

export const killROGKey = async () => {
	await checkRemoveAndRename(ARMCRATE_INTERFACE, ASUSACCI_PATH);
	LOGGER.info('Did thing 1');
	await checkRemoveAndRename(ARMCRATE_KEY_CTRL, ASUSACCI_PATH);
	LOGGER.info('Did thing 2');
	await checkRemoveAndRename(ARMORY_SW_AGENT, ARMORY_SW_AGENT_PATH);
	LOGGER.info('Did thing 3');
	await checkRemoveAndRename(ARMCRATE_SESS_HELPER, ARMCRATE_SVC_PATH);
	LOGGER.info('Did thing 4');
	await checkRemoveAndRename(ARMCRATE_SVC, ARMCRATE_SVC_PATH);
	LOGGER.info('Did thing 5');
	await checkRemoveAndRename(ARMSOCK_SERV, ARMSOCK_SERV_PATH);
	LOGGER.info('Did thing 6');
	await checkRemoveAndRename(ARMCRATE_MANAGER);
	LOGGER.info('Did thing 7');
	await checkRemoveAndRename(ARMCRATE_MANAGER_AGENT);
	return true;
};

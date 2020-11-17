/** @format */

import { exec } from 'child_process';
import getLogger from '../../Logger';
import dotenv from 'dotenv';
import is_dev from 'electron-is-dev';
import path from 'path';
import { app } from 'electron';
dotenv.config();

//@ts-ignore
// eslint-ignore-next-line
const ATRO_LOC = is_dev
	? (process.env.ATRO_LOC as string)
	: path.join(app.getPath('exe'), 'resources', 'extraResources', 'atrofac.exe');

const LOGGER = getLogger('SetArmoryPlan');

export const modifyArmoryCratePlan = async (plan: ArmoryPlan) => {
	return new Promise<ArmoryPlan | false>((resolve, reject) => {
		exec(`${ATRO_LOC} --plan ${plan}`, (err, out, stderr) => {
			if (err || stderr) {
				LOGGER.error(
					`Error setting atrofac armory crate plan: ${JSON.stringify({
						err,
						stderr,
					})}`
				);
				resolve(false);
			} else {
				LOGGER.info(
					`Result of atrofac armory crate plan:\n${JSON.stringify(out)}`
				);
				resolve(plan);
			}
		});
	});
};

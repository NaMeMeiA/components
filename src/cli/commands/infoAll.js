'use strict'

const { getAccessKey, getTemplate, getDashboardUrl } = require('./utils');
const { ServerlessSDK } = require('@serverless/platform-client');
const moment = require('moment');
const chalk = require('chalk');

module.exports = async (config, cli) => {
  cli.sessionStart('Fetching App Info', { timer: false });
  const templateYaml = await getTemplate(process.cwd());

  cli.logLogo();

  const meta = `Action: "info" - Stage: "${templateYaml.stage}" - Org: "${templateYaml.org}" - App: "${templateYaml.app}" - Name: "${templateYaml.name}"`;
  cli.log(meta, 'grey');
  cli.log();

  const accessKey = await getAccessKey(templateYaml.org);
  const sdk = new ServerlessSDK({
    accessKey,
  });

  const instanceYamls = Object.values(templateYaml).filter(
    (instance) => typeof instance === 'object'
  );

  for (const instanceYaml of instanceYamls) {
    cli.log(instanceYaml.name, 'whiteBold');

    const { instance } = await sdk.getInstance(
      instanceYaml.org,
      instanceYaml.stage,
      instanceYaml.app,
      instanceYaml.name
    );

    if (!instance || !instance.outputs || Object.keys(instance.outputs).length === 0) {
      cli.log(`  ${chalk.grey('Status:')}       ${chalk.red('inactive')}`);
      cli.log();
      continue;
    }

    // format last action for better UX
    const lastActionAgo = moment(instance.lastActionAt).fromNow();

    // color status based on...status
    let statusLog;
    if (instance.instanceStatus === 'error') {
      statusLog = chalk.red(instance.instanceStatus);
    } else if (instance.instanceStatus === 'active') {
      statusLog = chalk.green(instance.instanceStatus);
    } else if (instance.instanceStatus === 'inactive') {
      statusLog = chalk.yellow(instance.instanceStatus);
    } else {
      statusLog = instance.instanceStatus;
    }

    cli.log(`  ${chalk.grey('Last Action:')}  ${instance.lastAction} (${lastActionAgo})`);
    cli.log(`  ${chalk.grey('Deployments:')}  ${instance.instanceMetrics.deployments}`);
    cli.log(`  ${chalk.grey('Status:')}       ${statusLog}`);
    cli.log(
      `  ${chalk.grey('Component:')}    ${instance.componentName}@${instance.componentVersion}`
    );

    const outputs = instance.outputs;

    delete outputs.vendorMessage;

    cli.log(`  ${chalk.grey('Outputs:')}`);
    cli.logOutputs(outputs, 4);
    cli.log();
  }

  cli.log(`Full details: ${getDashboardUrl(`/${templateYaml.org}/?${templateYaml.name}`)}`);

  cli.sessionStop('success', 'App info fetched');
};

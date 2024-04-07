/**
 * Simple, ad-hoc, minimal nodejs-based REPL interface for interacting with the Canvas API.
 * Loosely based on the canvas-ui-shell project.
 */


// Utils
const axios = require('axios');
const chalk = require('chalk');
const stripAnsi = require('strip-ansi');
const fs = require('fs');
const os = require('os');
const path = require('path');

// Default configuration
let config = {
    protocol: 'http',
    host: '127.0.0.1',
    port: 8001,
    baseUri: '/rest/v1',
    auth: {
        type: 'token',
        token: 'canvas-rest-api',
    },
    timeout: 2000,
};

// Load configuration from default location
const configPath = path.join(os.homedir(), '.canvas', 'config', 'transports.rest.json');
if (fs.existsSync(configPath)) {
    try {
        const loadedConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        config = { ...config, ...loadedConfig };
    } catch (error) {
        console.warn(chalk.red('Failed to load or parse the config file, using defaults.'));
    }
}

// Initialize HTTP client
const httpClient = axios.create({
    baseURL: `${config.protocol}://${config.host}:${config.port}${config.baseUri}`,
    headers: {
        Authorization: `Bearer ${config.auth.token}`,
        'Content-Type': 'application/json',
    },
    timeout: config.timeout,
});


/**
 * Utility functions
 */

const apiReachable = async () => {
    try {
        const response = await httpClient.get('/ping');
        return response.data.payload === 'pong';
    } catch (error) {
        return false;
    }
}

function setPromptPath(path) {
    const styledPrompt = chalk.bold.hex('#FF69B4')(`[${path}] > `);
    vorpal.delimiter(styledPrompt);
    // vorpal.ui.delimiter(stripAnsi(styledPrompt));
}

function updatePrompt() {
    httpClient.get('/context/path')
        .then(response => {
            const contextPath = response.data.payload;
            setPromptPath(contextPath);
        }).catch(error => {
            vorpal.log('Error fetching context path:', error.message);
            setPromptPath('Canvas Server not reachable');
        });
}

function getData(path) {
    httpClient.get(path)
        .then(response => {
            vorpal.log(response.data.payload);
        }).catch(error => {
            vorpal.log('Error fetching data:', error.message);
        });
}

function postData(path, data) {
    httpClient.post(path, data)
        .then(response => {
            vorpal.log(response.data.payload);
        }).catch(error => {
            vorpal.log('Error posting data:', error.message);
        });
}


/**
 * Vorpal
 */

const vorpal = require('vorpal')()


/**
 * Context API
 */

vorpal
    .command('context', 'Returns /context')
    .action(function(args, callback) {
        getData('/context');
        callback();
    });

vorpal
    .command('context url', 'Returns /context/url')
    .action(function(args, callback) {
        getData('/context/url');
        callback();
    });

vorpal
    .command('context path', 'Returns /context/path')
    .action(function(args, callback) {
        getData('/context/path');
        callback();
    });

vorpal
    .command('context paths', 'Returns /context/paths')
    .action(function(args, callback) {
        getData('/context/paths');
        callback();
    });

vorpal
    .command('context tree', 'Returns /context/tree')
    .action(function(args, callback) {
        getData('/context/tree');
        callback();
    });

vorpal
    .command('context list [abstraction]', 'Returns all documents for the current context or documents of type <abstraction> if specified.')
    .action(function(args, callback) {
        if (args.abstraction) {
            this.log(`Fetching documents of type: ${args.abstraction}`);
            getData(`/context/documents/${args.abstraction}`);
        } else {
            this.log('Fetching all documents for the current context');
            getData('/context/documents');
        }
        callback();
    });


vorpal
    .command('context bitmaps', 'Returns /context/bitmaps')
    .action(function(args, callback) {
        getData('/context/bitmaps');
        callback();
    });

vorpal
    .command('context set <path>', 'Set context to the given path')
    .action(function (args, callback) {
        this.log(`Setting context to: ${args.path}`);
        postData('/context/url', JSON.stringify({
            url: args.path
        }));
        setPromptPath(args.path);
        callback();
    });


/**
 * Documents API
 */

vorpal
  .command('documents', 'Returns /documents')
  .action(function(args, callback) {
    fetchDataAndLog('/documents');
    callback();
  });

vorpal
  .command('documents notes', 'Returns /documents/notes')
  .action(function(args, callback) {
    fetchDataAndLog('/documents/notes');
    callback();
  });


/**
 * Contexts API
 */

vorpal
    .command('list', 'Returns /contexts')
    .action(function(args, callback) {
        fetchDataAndLog('/contexts');
        callback();
    });


/**
 * Init
 */

// Setting the initial prompt
vorpal
    .delimiter('Hit enter to start...')
    .show();

// Middleware to update the prompt on every command
vorpal.use((session) => {
    session.on('client_prompt_submit', () => {
        updatePrompt();
    });
});

updatePrompt();

// Start Vorpal
vorpal.show();
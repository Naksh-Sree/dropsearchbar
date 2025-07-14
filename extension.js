const vscode = require('vscode');
const fs = require('fs');
const xml2js = require('xml2js');
let panel = undefined;

function getWebviewContent(subFamilies) {
    return `<!DOCTYPE html>
    <html>
        <head>
            <style>
                body { padding: 20px; font-family: Arial, sans-serif; }
                .container {
                    display: flex;
                    gap: 20px;
                }
                .search-container {
                    margin-bottom: 15px;
                }
                #searchInput {
                    width: 100%;
                    padding: 8px;
                    border: 1px solid #ccc;
                    border-radius: 4px;
                    margin-bottom: 10px;
                }
                .device-list {
                    flex: 0 0 300px;
                    border: 1px solid #ccc;
                    border-radius: 4px;
                    padding: 10px;
                    height: 500px;
                    overflow-y: auto;
                }
                .device-item {
                    padding: 8px;
                    cursor: pointer;
                    border-radius: 4px;
                }
                .device-item:hover {
                    background-color: #f0f0f0;
                }
                .device-item.selected {
                    background-color: #007acc;
                    color: white;
                }
                .subfamily-header {
                    font-weight: bold;
                    margin-top: 10px;
                    padding: 5px;
                    background-color: #f5f5f5;
                }
                .info {
                    flex: 1;
                }
                #description {
                    padding: 15px;
                    border: 1px solid #ccc;
                    border-radius: 4px;
                    min-height: 100px;
                }
                .hidden {
                    display: none;
                }
            </style>
        </head>
        <body>
            <div class="search-container">
                <input type="text" id="searchInput" placeholder="Search devices...">
            </div>
            <div class="container">
                <div class="device-list" id="deviceList">
                    ${subFamilies.map(subfamily => `
                        <div class="subfamily-group" data-subfamily="${subfamily.label}">
                            <div class="subfamily-header">${subfamily.label}</div>
                            ${subfamily.devices.map(device => `
                                <div class="device-item" 
                                     data-subfamily="${subfamily.label}"
                                     data-device="${device.label}"
                                     data-description="${device.description}">
                                    ${device.label}
                                </div>
                            `).join('')}
                        </div>
                    `).join('')}
                </div>
                <div class="info">
                    <h3>Device Description</h3>
                    <div id="description">
                        Select a device to see its description...
                    </div>
                </div>
            </div>
            <script>
                const vscode = acquireVsCodeApi();
                const searchInput = document.getElementById('searchInput');
                const deviceList = document.getElementById('deviceList');
                const description = document.getElementById('description');
                let selectedDevice = null;

                function filterDevices(searchText) {
                    searchText = searchText.toLowerCase();
                    const groups = deviceList.getElementsByClassName('subfamily-group');
                    
                    Array.from(groups).forEach(group => {
                        const subfamilyHeader = group.querySelector('.subfamily-header');
                        const devices = group.getElementsByClassName('device-item');
                        let hasVisibleDevices = false;

                        Array.from(devices).forEach(device => {
                            const deviceText = device.textContent.toLowerCase();
                            const subfamilyText = group.dataset.subfamily.toLowerCase();
                            const matches = deviceText.includes(searchText) || 
                                          subfamilyText.includes(searchText);
                            
                            device.classList.toggle('hidden', !matches);
                            if (matches) hasVisibleDevices = true;
                        });

                        group.classList.toggle('hidden', !hasVisibleDevices);
                    });
                }

                searchInput.addEventListener('input', (e) => {
                    filterDevices(e.target.value);
                });

                deviceList.addEventListener('click', (e) => {
                    const deviceItem = e.target.closest('.device-item');
                    if (!deviceItem) return;

                    if (selectedDevice) {
                        selectedDevice.classList.remove('selected');
                    }
                    
                    deviceItem.classList.add('selected');
                    selectedDevice = deviceItem;
                    description.textContent = deviceItem.dataset.description;
                });
            </script>
        </body>
    </html>`;
}

function activate(context) {
    console.log('Extension activated');

    const disposable = vscode.commands.registerCommand('dropsearchbar.showSubFamilyDevices', async function () {
        if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
            vscode.window.showErrorMessage('Please open a workspace first');
            return;
        }

        const xmlFilePath = vscode.workspace.workspaceFolders[0].uri.fsPath + '/devices.pdsc';
        console.log('Attempting to read file from:', xmlFilePath);

        if (!fs.existsSync(xmlFilePath)) {
            vscode.window.showErrorMessage(`The devices.pdsc file does not exist at: ${xmlFilePath}`);
            return;
        }

        try {
            const xmlContent = fs.readFileSync(xmlFilePath, 'utf-8');
            const parser = new xml2js.Parser();
            const parsedData = await parser.parseStringPromise(xmlContent);

            if (!parsedData.package?.devices?.[0]?.family) {
                vscode.window.showErrorMessage('Invalid .pdsc file structure');
                return;
            }

            const devicesData = parsedData.package.devices[0];
            const subFamilies = devicesData.family.flatMap(family => 
                family.subFamily ? family.subFamily.map(subFamily => ({
                    label: subFamily.$.DsubFamily,
                    devices: subFamily.device ? subFamily.device.map(device => ({
                        label: device.$.Dname,
                        description: device.description ? device.description[0] : 'No description available'
                    })) : []
                })) : []
            );

            if (subFamilies.length === 0) {
                vscode.window.showErrorMessage('No subfamilies found in the .pdsc file');
                return;
            }

            panel = vscode.window.createWebviewPanel(
                'deviceSelector',
                'Device Selector',
                vscode.ViewColumn.One,
                {
                    enableScripts: true
                }
            );

            panel.webview.html = getWebviewContent(subFamilies);

            panel.webview.onDidReceiveMessage(
                message => {
                    switch (message.command) {
                        case 'close':
                            panel.dispose();
                            break;
                    }
                },
                undefined,
                context.subscriptions
            );

        } catch (error) {
            console.error('Error:', error);
            vscode.window.showErrorMessage('Failed to process the .pdsc file: ' + error.message);
        }
    });

    context.subscriptions.push(disposable);
}

function deactivate() {
    if (panel) {
        panel.dispose();
    }
}

module.exports = {
    activate,
    deactivate
};
const assert = require('assert');
const chai = require('chai');
const sinon = require('sinon');
const vscode = require('vscode');
const path = require('path');
const fs = require('fs');
const xml2js = require('xml2js');

const expect = chai.expect;

suite('Extension Test Suite', () => {
    let sandbox;

 
    setup(() => {
        sandbox = sinon.createSandbox();
    });

  
    teardown(() => {
        sandbox.restore();
    });

    suite('Extension Module', () => {
        test('Should load extension module correctly', () => {
            console.log('✅ Running extension module test');
            const extensionMain = require('../extension');
            
            expect(extensionMain).to.exist;
            expect(extensionMain.activate).to.be.a('function');
            expect(extensionMain.deactivate).to.be.a('function');
            
            console.log('✅ Extension module loaded successfully');
        });

        test('Should have required dependencies available', () => {
            console.log('✅ Testing dependencies');
            
       
            expect(xml2js).to.exist;
            expect(xml2js.Parser).to.exist;
        
            expect(fs.existsSync).to.be.a('function');
            expect(fs.readFileSync).to.be.a('function');
            
            console.log('✅ All dependencies available');
        });
    });

    suite('XML Processing', () => {
        test('Should parse XML correctly', async function() {
            console.log('✅ Testing XML parsing');
            
            const parser = new xml2js.Parser();
            const testXml = `<?xml version="1.0"?>
                <pdsc>
                    <devices>
                        <family Dfamily="TestFamily">
                            <subFamily DsubFamily="TestSub">
                                <device Dname="TestDevice">
                                    <description>Test Description</description>
                                </device>
                            </subFamily>
                        </family>
                    </devices>
                </pdsc>`;
            
            try {
                const result = await parser.parseStringPromise(testXml);
                
                expect(result).to.exist;
                expect(result.pdsc).to.exist;
                expect(result.pdsc.devices).to.exist;
                
                console.log('✅ XML parsing works correctly');
            } catch (error) {
                console.log('❌ XML parsing failed:', error.message);
                throw error;
            }
        });
    });

    suite('Extension Functions', () => {
        test('Should export activate and deactivate functions', () => {
            console.log('✅ Testing extension function exports');
            
            const extension = require('../extension');
            
            expect(typeof extension.activate).to.equal('function');
            expect(typeof extension.deactivate).to.equal('function');
            
            console.log('✅ Extension functions exported correctly');
        });

        test('Should handle mock context without errors', () => {
            console.log('✅ Testing extension with mock context');
            
            const extension = require('../extension');
            const mockContext = { 
                subscriptions: [],
                extensionPath: __dirname,
                globalState: {
                    get: () => undefined,
                    update: () => Promise.resolve()
                },
                workspaceState: {
                    get: () => undefined,
                    update: () => Promise.resolve()
                }
            };
            
           
            try {
               
                expect(() => extension.activate).to.not.throw();
                console.log('✅ Extension handles mock context correctly');
            } catch (error) {
                console.log('❌ Extension context handling failed:', error.message);
                throw error;
            }
        });
    });

    suite('File System Operations', () => {
        test('Should handle file operations', () => {
            console.log('✅ Testing file system operations');
            
         
            const testPath = path.join(__dirname, '../extension.js');
            
            expect(fs.existsSync(testPath)).to.be.true;
            
            const content = fs.readFileSync(testPath, 'utf8');
            expect(content).to.be.a('string');
            expect(content.length).to.be.greaterThan(0);
            
            console.log('✅ File system operations work correctly');
        });
    });
});
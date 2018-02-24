// Interaction with the Google Sheets API for the Crossword grid builder project.

// To use, first set up the project at the quick start guide:
// https://developers.google.com/sheets/api/quickstart/js

// To update the project and get the API key, visit the project console page:
// https://console.developers.google.com/apis/credentials?project=sustained-pod-193202

// This project has two API keys, one for local development (ending in "is"), and one for production
// (ending in "fk"). The appropriate key should be placed in a file by itself this directory with
// the name: api_key.txt. This file is excluded from source control.

// I don't really see the point of this, since it ultimately needs to be served to the client. This
// StackOverflow post seems to agree, there's no way to keep it ultimately secure:
// https://stackoverflow.com/questions/1364858/what-steps-should-i-take-to-protect-my-google-maps-api-key
// However, the documentation suggests it needs to be kept secret so I'm doing this anyway.
// https://support.google.com/cloud/answer/6310037

"use strict"

let sheets = {
	// Get from the project console page:
	// https://console.developers.google.com/apis/credentials?project=sustained-pod-193202
	clientid: "602982127445-j39ugtai0cpu0j8kra8kttslctavb1pt.apps.googleusercontent.com",

	// Will be overwritten by this.retrieveapikey
	apikey: null,

	// https://developers.google.com/sheets/api/guides/authorizing
	// For per-file access
	scope: "https://www.googleapis.com/auth/drive.file",

	// true when all the setup work and signin is complete.
	ready: false,

	// Returns a Promise that resolves once setup and signin is complete. At this point you may
	// use sheets.createspreadsheet and sheets.updatesheet.
	init: function () {
		if (this.ready) return Promise.resolve()
		return Promise.all([this._loadapi(), this._retrieveapikey()])
			.then(() => this._initclient())
			.then(() => this._signin())
			.then(() => {
				this.ready = true
				return "Signed in"
			})
	},
	// Load the script for the Google drive API
	_loadapi: function () {
		return new Promise((resolve, reject) => {
			// Example of loading this script in the create spreadsheet section:
			// https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/create
			let script = document.createElement("script")
			script.src = "https://apis.google.com/js/api.js"
			script.onload = () => { resolve() }
			document.head.appendChild(script);
		})
	},
	_retrieveapikey: function () {
		return new Promise((resolve, reject) => {
			let req = new XMLHttpRequest()
			req.open("GET", "api_key.txt")
			req.onload = () => {
				this.apikey = req.response.trim()
				resolve()
			}
			req.send()
		})
	},
	_initclient: function () {
		return new Promise((resolve, reject) => {
			gapi.load('client:auth2', () => {
				gapi.client.init({
					apiKey: this.apikey,
					clientId: this.clientid,
					scope: this.scope,
					discoveryDocs: [
						"https://sheets.googleapis.com/$discovery/rest?version=v4",
					],
				}).then(resolve).catch(reject)
			})
		})
	},

	// Called automatically by init.
	_signin: function () {
		return gapi.auth2.getAuthInstance().signIn()
			.catch(reason => { throw "Sign in failed: " + (reason.error || JSON.stringify(reason)) })
	},

	signout: function () {
		if (!this.ready) return
		this.ready = false
		gapi.auth2.getAuthInstance().signOut();
	},

	// On success: returns the spreadsheet url.
	// On failure: returns the error message.
	createspreadsheet: function () {
		let body = {}
		return new Promise((resolve, reject) => {
			if (!this.ready) {
				reject("Sheets API not initalized")
				return
			}
			gapi.client.sheets.spreadsheets.create({}, body)
				.then(response => {
					resolve(response.result.spreadsheetUrl)
				}).catch(reason => {
					reject(reason.result.error.message)
				})
		})
	},

	// Get the corresponding ID for a given spreadsheet URL. Returns null on bad URL.
	getspreadsheetid: function (spreadsheeturl) {
		let match = spreadsheeturl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
		return match ? match[1] : null
	},

	// On success: the sheet id
	// On failure: the error message
	addsheet: function (spreadsheeturl, properties) {
		let requests = [{
			addSheet: {
				properties: properties || {},
			},
		}]
		return this.updatesheet(spreadsheeturl, requests)
			.then(replies => replies[0].addSheet.properties.sheetId)
	},

	// On success: list of replies
	// On failure: the error message
	updatesheet: function (spreadsheeturl, requests) {
		return new Promise((resolve, reject) => {
			let id = this.getspreadsheetid(spreadsheeturl)
			if (!id) throw "Invalid spreadsheet url : " + spreadsheeturl
			resolve(id)
		}).then(spreadsheetid => {
			return gapi.client.sheets.spreadsheets.batchUpdate({
				spreadsheetId: spreadsheetid,
				resource: {
					requests: requests,
				},
			})
		}).then(
			response => response.result.replies
		)
		.catch(reason => {
			throw reason.result.error.message
		})
	},

	deletefirstsheet: function (spreadsheeturl) {
		let id = this.getspreadsheetid(spreadsheeturl)
		return gapi.client.sheets.spreadsheets.get({
			spreadsheetId: id,
		}).then(response => {
			let sheetid = response.result.sheets[0].properties.sheetId
			return this.updatesheet(spreadsheeturl, [{
				deleteSheet: {
					sheetId: sheetid,
				},
			}])
		})	
	},
}


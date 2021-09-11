//@ts-check
// ...
import { format } from "util"
import got from "got"
const fs = require("fs-extra")
const xl = require("exceljs")

//Generated files
const apiConfig = require("./api_config.json")
const currency_ids: CurrencyIdData = require("./currency_ids.json")

//Site
const CMC_HISTORICAL_API =
	"https://api.coinmarketcap.com/data-api/v3/cryptocurrency/historical?id=%s&convertId=%s&timeStart=%s&timeEnd=%s"
//API key for CMC
const API_KEY = apiConfig.api_key

//USER INPUTS
const JSON_CACHE_PATH = "./json/"
const EXCEL_SAVE_PATH = "./excel/"

// INTERFACES ===================================================================
interface CoinData {
	id: number
	name: string
	symbol: string
	slug: string
	rank: number
	is_active: number
	first_historical_data: string
	last_historical_data: string
}

interface CurrencyIdData {
	status: {}
	data: CoinData[]
}

interface HistoricalData {
	status: {
		timestamp: string
	}
	data: {
		id: number
		name: string
		symbol: string
		quotes: HistoricalDataQuote[]
	}
}

interface HistoricalDataQuote {
	timeOpen: string
	timeClose: string
	timeHigh: string
	timeLow: string
	quote: Quote
}

interface Quote {
	open: number
	high: number
	low: number
	close: number
	volume: number
	marketCap: number
	timestamp: string
}

type JSONResponseData = HistoricalData | CurrencyIdData;

// FUNCTIONS ===================================================================
// ASYNC FUNCTIONS -------------------------------------------------------------

async function updateCMCIds() {
	const API_URL = "https://pro-api.coinmarketcap.com/v1/cryptocurrency/map"
	const FILENAME = "currency_ids.json"
	let options = {
		headers: {
			"X-CMC_PRO_API_KEY": API_KEY,
		},
	}
	const jsonData = await getJsonData(API_URL, options)
	fs.ensureDirSync(JSON_CACHE_PATH)
	const writeData = JSON.stringify(jsonData, null, 2)
	fs.writeFileSync(FILENAME, writeData)
	return new Promise<string>((resolve) => {
		resolve("Finished getting CMC IDs.")
	})
}

async function getHistoricalData(coin: CoinData, startDate = convertUTCSeconds(new Date(coin.first_historical_data).getTime()), endDate = convertUTCSeconds(Date.now())) {
	const URL = getHistoricalDataURL(coin, startDate, endDate)
	let filename = "[%s] %s - historical.json"
	filename = format(filename, coin.symbol, coin.name)
	const jsonData: HistoricalData = await getJsonData(URL, null) as HistoricalData
	return new Promise<HistoricalData>((resolve) => {
		resolve(jsonData)
	})
}

async function getJsonData(url: string, options: {} | null) {
	let jsonData: JSONResponseData
	if (options === null) {
		jsonData = await got(url).json()
	} else {
		jsonData = await got(url, options).json()
	}
	// if (!(path === null)) {
	// 	fs.ensureDirSync(path)
	// 	filename = path + filename
	// }
	// const writeData = JSON.stringify(jsonData, null, 2)
	// fs.writeFileSync(filename, writeData)
	return new Promise<JSONResponseData>((resolve) => {
		resolve(jsonData)
	})
}

async function updateHistoricalData(coin: CoinData) {
	// Check if cache has json. if not then get all data and write. default behaviours
	let filename = "[%s] %s - historical.json"
	filename = format(filename, coin.symbol, coin.name)
	// if cache has json then get from status timestamp up to now data
	// append data to json file, change status timestamp then write
	let updatedJsonData: HistoricalData
	if (fs.existsSync(JSON_CACHE_PATH + filename)) {
		const jsonData: HistoricalData = JSON.parse(fs.readFileSync(JSON_CACHE_PATH + filename))
		const previousTimestamp = jsonData.status.timestamp
		const previousTimestampUTC = getUTCTime(previousTimestamp.toString().substring(0, 10))
		updatedJsonData = await getHistoricalData(coin, previousTimestampUTC)
		updatedJsonData = appendHistoricalData(jsonData, updatedJsonData)
	} else {
		updatedJsonData = await getHistoricalData(coin)
	}
	const writeData = JSON.stringify(updatedJsonData, null, 2)
	fs.ensureDirSync(JSON_CACHE_PATH)
	fs.writeFileSync(JSON_CACHE_PATH + filename, writeData)
}

//NON ASYNC FUNCTIONS -------------------------------------------------------------
function appendHistoricalData(prevData: HistoricalData, updatedData: HistoricalData) {
	let ret = prevData
	updatedData.data.quotes.forEach((dataPiece: HistoricalDataQuote) => {
		ret.data.quotes.push(dataPiece)
	})
	return ret
}

function getCMCIds(coins: string | Array<string>) {
	let coinarray: Array<string>
	let ret: CoinData[] = []
	if (typeof coins === "string") {
		coinarray = [coins]
	} else {
		coinarray = coins
	}
	currency_ids.data.forEach((currencyData: CoinData) => {
		coinarray.forEach((coin: string) => {
			if (
				coin.toLocaleLowerCase() === currencyData["name"].toLowerCase() ||
				coin.toLocaleLowerCase() === currencyData["symbol"].toLowerCase()
			) {
				ret.push(currencyData)
			}
		})
	})
	return ret
}

function convertUTCSeconds(time: number) {
	return (time - (time % 1000)) / 1000
}

function getHistoricalDataURL(coin: CoinData, startDate: number, endDate: number) { // startDate = convertUTCSeconds(new Date(coin.first_historical_data).getTime()), endDate = convertUTCSeconds(Date.now())) {
	let convertCurrency = 2781
	return format(
		CMC_HISTORICAL_API,
		coin.id,
		convertCurrency,
		startDate,
		endDate
	)
}

function toExcel(filename: string[], startDate: string, endDate: string) {
	filename.forEach(file => {
		console.log(process.cwd())
		console.log((JSON_CACHE_PATH + file))
		const data: HistoricalData = JSON.parse(fs.readFileSync(JSON_CACHE_PATH + file))

		let workbook = new xl.Workbook()
		let sheet1 = workbook.addWorksheet("data")

		//Header setup
		let headers = [
			"Date",
			"Open",
			"Open D",
			"High",
			"High D",
			"Low",
			"Low D",
			"Close",
			"Close D",
			"Volume",
			"Volume D",
			"Market Cap",
			"Market cap D",
		]
		let row = 1
		let col = 1
		headers.forEach((header) => {
			sheet1.getRow(row).getCell(col).value = header
			col++
		})

		let startDateU = getUTCTime(startDate)
		// console.log(startDate + " : " + startDateU)
		let endDateU = getUTCTime(endDate)
		// console.log(endDate + " : " + endDateU)

		//Write data
		row = 2
		data.data.quotes.forEach((quoteData) => {
			let curDataDate = quoteData.quote.timestamp.substring(0, 10)
			let curDataDateU = getUTCTime(curDataDate)
			// console.log("==========================================================")
			// console.log("START: " + startDate + " : " + startDateU)
			// console.log("END  : " + endDate + " : " + endDateU)
			// console.log("CURRE: " + curDataDate + " : " + curDataDateU)
			if ((curDataDateU >= startDateU) && (curDataDateU <= endDateU)) {
				// console.log("ran")
				sheet1.getRow(row).getCell(1).value = curDataDate
				sheet1.getRow(row).getCell(2).value = quoteData.quote.open
				sheet1.getRow(row).getCell(4).value = quoteData.quote.high
				sheet1.getRow(row).getCell(6).value = quoteData.quote.low
				sheet1.getRow(row).getCell(8).value = quoteData.quote.close
				sheet1.getRow(row).getCell(10).value = quoteData.quote.volume
				sheet1.getRow(row).getCell(12).value = quoteData.quote.marketCap

				sheet1.getRow(row).getCell(3).value = {
					formula: (
						"(B" + row + " - B" + (row + 1) + ")/B" + (row + 1))
				}
				sheet1.getRow(row).getCell(5).value = {
					formula: (
						"(D" + row + " - D" + (row + 1) + ")/D" + (row + 1))
				}
				sheet1.getRow(row).getCell(7).value = {
					formula: (
						"(F" + row + " - F" + (row + 1) + ")/F" + (row + 1))
				}
				sheet1.getRow(row).getCell(9).value = {
					formula: (
						"(H" + row + " - H" + (row + 1) + ")/H" + (row + 1))
				}
				sheet1.getRow(row).getCell(11).value = {
					formula: (
						"J" + row + " - J" + (row + 1)
					)
				}
				sheet1.getRow(row).getCell(13).value = {
					formula: (
						"L" + row + " - L" + (row + 1)
					)
				}
				row++
			}
		})

		fs.ensureDirSync(EXCEL_SAVE_PATH)
		workbook.xlsx.writeFile(
			EXCEL_SAVE_PATH + format("[%s] %s historical.xlsx", data.data.symbol, data.data.name)
		)
	})
}

function getJsonCacheFilenames() {
	return fs.readdirSync(JSON_CACHE_PATH)
}

function getUTCTime(date: string) {
	return convertUTCSeconds(new Date(date).getTime())
}

function getAllCoins() {
	let ret: string[] = []
	currency_ids.data.forEach((currencyData: CoinData) => {
		ret.push("[" + currencyData.symbol + "] " + currencyData.name)
	})
	return ret
}

// TEST MAIN ====================================================================
async function main() {
	// let testFA = JSON_CACHE_PATH + "[BTC] Bitcoin - historical.json"
	// let testFB = JSON_CACHE_PATH + "TEST - [BTC] Bitcoin - historical.json"
	// let testFAOb: HistoricalData = JSON.parse(fs.readFileSync(testFA))
	// let testFBOb: HistoricalData = JSON.parse(fs.readFileSync(testFB))
	// const writeData = JSON.stringify(appendHistoricalData(testFAOb, testFBOb), null, 2)
	// fs.writeFileSync(JSON_CACHE_PATH + "combined.json", writeData)

	let coinList = ["bitcoin", "eth", "ltc", "link"]
	let coins = getCMCIds(coinList)
	for (const [key, value] of Object.entries(coins)) {
		updateHistoricalData(value)
	}
	// console.log("start")
	// let allJsonCache = getJsonCacheFilenames()
	// allJsonCache.forEach((coin: string) => {
	// });

	// let test = "2015-08-08"
	// let testU = getUTCTime(test)
	// let before = "2015-01-01"
	// let beforeU = getUTCTime(before)
	// let after = "2015-09-01"
	// let afterU = getUTCTime(after)
	// console.log("b > t: " + (beforeU > testU))
	// console.log("b < t: " + (beforeU < testU))
	// console.log("a > t: " + (afterU > testU))
	// console.log("a < t: " + (afterU < testU))

	// console.log(getUTCTime("2021-09-31"))
	// toExcel(allJsonCache, "2021-07-01", "2021-07-31")

	// let start = 1625097600
	// let end = 1627603200
	// let cur = 1630195200//1627084800
	// console.log((cur >= start) && (cur <= end))
}

if (require.main === module) {
	main()
}

export {
	getAllCoins,
	getCMCIds,
	updateHistoricalData,
	toExcel,
	getJsonCacheFilenames
}
const API_KEY = "9a0abc5b6207ef87b4e1f36055cfffab";

const DAYS_OF_THE_WEEK = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

let selectedCityText;

let selectedCity;

const getCitiesUsingGeoLocation = async(searchText)=>{
    const response = await fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${searchText}&limit=10&appid=${API_KEY}`);
    // console.log(response.json())
    return response.json();
}

const getCurrentWeatherData = async({lat, lon, name:city})=>{
    // const city = "pune";
    // console.log(city)
    const url = lat && lon ? `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric` : `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=metric`
    const response = await fetch(url)
    return response.json()
}

const getHourlyData = async({name: city})=>{
    // const city = "pune";
    const response = await fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${API_KEY}&units=metric`)
    const data = await response.json()
    return data.list.map(forecast=>{
        const { main: {temp, temp_max, temp_min}, weather:[{description, icon}], dt, dt_txt} = forecast
        return {temp, temp_max, temp_min, description, icon, dt, dt_txt}
    })
}

const formatTemp = (temp) => `${temp?.toFixed(1)}°`;

const computeIcon = (icon) => {
    if(icon == "03d" || icon == "03n"){
        return `http://openweathermap.org/img/wn/04n@2x.png`
    }
    console.log(icon)
    return `http://openweathermap.org/img/wn/${icon}@2x.png`
}

const calculateDayWise = (hourlyData)=>{
    let dayWiseForecast = new Map()
    for(forecast of hourlyData){
        const date = forecast.dt_txt.split(" ")
        const dayOfTheWeek = DAYS_OF_THE_WEEK[new Date(date).getDay()]
        // console.log(dayOfTheWeek)
        if(dayWiseForecast.has(dayOfTheWeek)){
            let forecastForTheDay = dayWiseForecast.get(dayOfTheWeek)
            forecastForTheDay.push(forecast)
            dayWiseForecast.set(dayOfTheWeek, forecastForTheDay)
            // console.log(forecastForTheDay)
        }
        else{
            dayWiseForecast.set(dayOfTheWeek, [forecast])
        }
    }
    for(let [key, value] of dayWiseForecast){
        let temp_min = Math.min(...Array.from(value, val=> val.temp_min))
        let temp_max = Math.max(...Array.from(value, val=> val.temp_max))
        
        dayWiseForecast.set(key, {temp_min, temp_max, icon: value.find(v=> v.icon).icon})
    }
    // console.log(dayWiseForecast)
    return dayWiseForecast
}

const loadCurrentInfo = ({name, main: {temp, temp_max, temp_min}, weather:[{description}]})=>{
    const currentWeatherElement= document.querySelector("#current-forecast");
    currentWeatherElement.querySelector(".city").textContent = name;
    currentWeatherElement.querySelector(".temp").textContent = formatTemp(temp);
    currentWeatherElement.querySelector(".description").textContent = description;
    currentWeatherElement.querySelector(".high-low").textContent = `High: ${formatTemp(temp_max)} Low: ${formatTemp(temp_min)}`;
}

const loadHourlyInfo = ({main:{temp:tempNow},weather:[{icon: iconNow}]}, hourlyData)=>{
    // hourlyDataElement.querySelector(".hourly-temp").textContent = formatTemp(temp);
    // console.log(hourlyData)
    const timeFormatter = Intl.DateTimeFormat("en",{
        hour12: true, hour: "numeric"
    })
    let dataFor12Hours = hourlyData.slice(2,14);
    const hourlyContainerElement = document.querySelector(".hourlyContainer")
    let innerHTMLString = `<article >
                                <h3 class="time">Now</h3>
                                <img class="icon" src="${computeIcon(iconNow)}" alt="icon">
                                <p class="hourly-temp">${formatTemp(tempNow)}</p>
                            </article>`
    for(let {temp, dt_txt, icon} of dataFor12Hours){
        innerHTMLString += `<article>
                                <h3 class="time">${timeFormatter.format(new Date(dt_txt))}</h3>
                                <img class="icon" src="${computeIcon(icon)}" alt="icon">
                                <p class="hourly-temp">${formatTemp(temp) }</p>
                            </article>`
    }
    hourlyContainerElement.innerHTML = innerHTMLString
}

const loadFiveDayInfo = (hourlyData)=>{
    // console.log(hourlyData)
    const dayWiseForecast = calculateDayWise(hourlyData)
    const fiveDayElement = document.querySelector(".five-day-container")
    let dayWiseInfo = ""
    Array.from(dayWiseForecast).map(([day, {temp_min, temp_max, icon}], index)=>{
        if(index<5){
            dayWiseInfo += `<article class="day-wise-forecaste">
                                <h3 class="day">${index==0? "today": day}</h3>
                                <img class="icon" src="${computeIcon(icon)}" alt="icon">
                                <p class="low">${formatTemp(temp_min)}</p>
                                <p class="high">${formatTemp(temp_max)}</p>
                            </article>`
        }
    })
    fiveDayElement.innerHTML = dayWiseInfo
}

const loadFeelsLikeInfo = ({main:{feels_like}})=>{
    let feelsLikeElement = document.querySelector("#feels-like")
    feelsLikeElement.querySelector(".feels-temp").textContent = formatTemp(feels_like)
}

const loadHumidityInfo = ({main:{humidity}})=>{
    let humidityElement = document.querySelector("#humidity")
    humidityElement.querySelector(".humidity-value").textContent = humidity
}

const loadData = async()=>{
    const currentWeather = await getCurrentWeatherData(selectedCity);
    loadCurrentInfo(currentWeather)
    const hourlyData = await getHourlyData(currentWeather)
    loadHourlyInfo(currentWeather, hourlyData)
    loadFiveDayInfo(hourlyData)
    loadFeelsLikeInfo(currentWeather)
    loadHumidityInfo(currentWeather)
}

const loadForecastUsingGeoLoction = ()=>{
    // check = true
    navigator.geolocation.getCurrentPosition(({coords})=>{
        // console.log(coords)
        // console.log("chcek")
            const {latitude:lat, longitude:lon} = coords
            selectedCity = {lat, lon}
            loadData()
            // check = false
    }, error=>{
        // console.log(error)
        selectedCity = {name:"jammu"}
        loadData()
    })
    // if(check){
    //     selectedCity = {name:"jammu"}
    //     loadData()
    // }
}

function debounce(func){
    let timer
    return (...args)=>{
        clearTimeout(timer) // clear the existing timer
        // create a new time till the user is typing
        timer = setTimeout(() => {
            // console.log("debounce")
            func.apply(this,args)
        }, 500);
    }
}

const onSearchChange = async(event)=>{
    let {value} = event.target;
    if(!value){
        selectedCity = null
        selectedCityText = ""
    }
    if(value && value!=selectedCityText){
        const listOfCities = await getCitiesUsingGeoLocation(value);
        let options = ''
        for(let {lat, lon, name, state, country} of listOfCities){
            options += `<option data-city-details='${JSON.stringify({lat, lon, name})}' value="${name}, ${state}, ${country}"></option>`
        }
        document.querySelector("#cities").innerHTML = options
        // console.log((listOfCities))
    }
}
    
const handleCitySelection = (event)=>{
    selectedCityText = event.target.value
    let options = document.querySelectorAll("#cities > option")
    if(options?.length){
        // console.log(options)
        let selectedOption = Array.from(options).find(opt=> opt.value == selectedCityText);
        // let selectedOption = Array.from(options).find(opt=> opt.value === selectedCityText);
        // console.log(selectedCityText)
        // console.log(selectedOption)
        selectedCity = JSON.parse(selectedOption.getAttribute("data-city-details"))
        // console.log({selectedCity})
        loadData()
    }
}

const debounceSearch = debounce((event)=>onSearchChange(event))

document.addEventListener("DOMContentLoaded", async()=>{
    loadForecastUsingGeoLoction()
    const searchInput = document.querySelector("#search")
    searchInput.addEventListener("input",debounceSearch)
    searchInput.addEventListener("change",handleCitySelection)
})
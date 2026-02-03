import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const location = url.searchParams.get('location')
    const date = url.searchParams.get('date') // ISO date string
    
    if (!location || !date) {
      return new Response(JSON.stringify({ error: 'Missing parameters' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const apiKey = Deno.env.get('GOOGLE_WEATHER_API_KEY')
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // First, geocode the location to get coordinates
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(location)}&key=${apiKey}`
    const geocodeResponse = await fetch(geocodeUrl)
    const geocodeData = await geocodeResponse.json()
    
    if (geocodeData.status !== 'OK' || !geocodeData.results?.[0]) {
      return new Response(JSON.stringify({ error: 'Location not found', details: geocodeData }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { lat, lng } = geocodeData.results[0].geometry.location

    // Use Google Weather API for forecast
    const weatherUrl = `https://weather.googleapis.com/v1/forecast/days:lookup?key=${apiKey}&location.latitude=${lat}&location.longitude=${lng}&days=10`
    
    const weatherResponse = await fetch(weatherUrl)
    const weatherData = await weatherResponse.json()

    if (!weatherData.forecastDays || weatherData.forecastDays.length === 0) {
      return new Response(JSON.stringify({ error: 'No forecast available', details: weatherData }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Find forecast for the event date
    const eventDate = new Date(date)
    const eventDateStr = eventDate.toISOString().split('T')[0]
    
    let targetForecast = null
    for (const forecast of weatherData.forecastDays) {
      const forecastDateStr = `${forecast.displayDate.year}-${String(forecast.displayDate.month).padStart(2, '0')}-${String(forecast.displayDate.day).padStart(2, '0')}`
      if (forecastDateStr === eventDateStr) {
        targetForecast = forecast
        break
      }
    }

    // If exact match not found, use first forecast
    if (!targetForecast) {
      targetForecast = weatherData.forecastDays[0]
    }

    // Convert Celsius to Fahrenheit
    const celsiusToFahrenheit = (celsius: number) => Math.round((celsius * 9/5) + 32)
    
    // Convert km/h to mph
    const kmhToMph = (kmh: number) => Math.round(kmh * 0.621371)

    const result = {
      temperature: celsiusToFahrenheit(targetForecast.maxTemperature.degrees),
      feelsLike: celsiusToFahrenheit(targetForecast.feelsLikeMaxTemperature.degrees),
      condition: targetForecast.daytimeForecast.weatherCondition.type.replace(/_/g, ' '),
      description: targetForecast.daytimeForecast.weatherCondition.description.text,
      humidity: targetForecast.daytimeForecast.relativeHumidity,
      windSpeed: kmhToMph(targetForecast.daytimeForecast.wind.speed.value),
      precipitation: targetForecast.daytimeForecast.precipitation.probability.percent,
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

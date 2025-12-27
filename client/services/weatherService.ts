interface WeatherResponse {
  weather: {
    main: string;
    description: string;
    icon: string;
  }[];
  main: {
    temp: number;
    feels_like: number;
    humidity: number;
  };
  name: string;
  coord: {
    lat: number;
    lon: number;
  };
}

interface WeatherData {
  condition: string;
  temperature: number;
  description: string;
  city: string;
  humidity: number;
  feelsLike: number;
}

class WeatherService {
  private readonly API_KEY =
    process.env.REACT_APP_WEATHER_API_KEY || "demo_key";
  private readonly BASE_URL = "https://api.openweathermap.org/data/2.5/weather";

  async getCurrentWeather(lat: number, lon: number): Promise<WeatherData> {
    try {
      // For demo purposes, simulate weather API response
      // In production, uncomment the real API call below

      const demoWeatherConditions = [
        {
          condition: "sunny",
          temp: 22,
          description: "Clear sky",
          humidity: 65,
        },
        {
          condition: "rainy",
          temp: 18,
          description: "Light rain",
          humidity: 85,
        },
        {
          condition: "cloudy",
          temp: 20,
          description: "Partly cloudy",
          humidity: 70,
        },
        {
          condition: "snowy",
          temp: -2,
          description: "Light snow",
          humidity: 90,
        },
      ];

      const randomWeather =
        demoWeatherConditions[
          Math.floor(Math.random() * demoWeatherConditions.length)
        ];

      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API delay

      return {
        condition: randomWeather.condition,
        temperature: randomWeather.temp,
        description: randomWeather.description,
        city: "Your City",
        humidity: randomWeather.humidity,
        feelsLike: randomWeather.temp + Math.floor(Math.random() * 4) - 2,
      };

      // Real API call (uncomment for production):
      /*
      const url = `${this.BASE_URL}?lat=${lat}&lon=${lon}&appid=${this.API_KEY}&units=metric`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Weather API error: ${response.status}`);
      }

      const data: WeatherResponse = await response.json();
      
      return {
        condition: this.mapWeatherCondition(data.weather[0].main.toLowerCase()),
        temperature: Math.round(data.main.temp),
        description: data.weather[0].description,
        city: data.name,
        humidity: data.main.humidity,
        feelsLike: Math.round(data.main.feels_like)
      };
      */
    } catch (error) {
      console.error("Failed to fetch weather data:", error);
      throw new Error("Unable to fetch weather data");
    }
  }

  async getWeatherByCity(cityName: string): Promise<WeatherData> {
    try {
      // Demo implementation
      const demoWeatherConditions = [
        { condition: "sunny", temp: 25, description: "Clear sky" },
        { condition: "rainy", temp: 16, description: "Heavy rain" },
        { condition: "cloudy", temp: 19, description: "Overcast" },
        { condition: "snowy", temp: -5, description: "Snow showers" },
      ];

      const randomWeather =
        demoWeatherConditions[
          Math.floor(Math.random() * demoWeatherConditions.length)
        ];

      await new Promise((resolve) => setTimeout(resolve, 800));

      return {
        condition: randomWeather.condition,
        temperature: randomWeather.temp,
        description: randomWeather.description,
        city: cityName,
        humidity: Math.floor(Math.random() * 40) + 50,
        feelsLike: randomWeather.temp + Math.floor(Math.random() * 6) - 3,
      };

      // Real API call for city name:
      /*
      const url = `${this.BASE_URL}?q=${cityName}&appid=${this.API_KEY}&units=metric`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Weather API error: ${response.status}`);
      }

      const data: WeatherResponse = await response.json();
      
      return {
        condition: this.mapWeatherCondition(data.weather[0].main.toLowerCase()),
        temperature: Math.round(data.main.temp),
        description: data.weather[0].description,
        city: data.name,
        humidity: data.main.humidity,
        feelsLike: Math.round(data.main.feels_like)
      };
      */
    } catch (error) {
      console.error("Failed to fetch weather data for city:", error);
      throw new Error("Unable to fetch weather data for the specified city");
    }
  }

  private mapWeatherCondition(condition: string): string {
    const weatherMap: Record<string, string> = {
      clear: "sunny",
      clouds: "cloudy",
      rain: "rainy",
      drizzle: "rainy",
      thunderstorm: "rainy",
      snow: "snowy",
      mist: "cloudy",
      fog: "cloudy",
      haze: "cloudy",
    };

    return weatherMap[condition] || "sunny";
  }

  async getUserLocation(): Promise<{ lat: number; lon: number }> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported by this browser"));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          });
        },
        (error) => {
          reject(new Error("Unable to retrieve your location"));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000, // 5 minutes
        },
      );
    });
  }

  getWeatherIcon(condition: string): string {
    const iconMap: Record<string, string> = {
      sunny: "☀️",
      rainy: "🌧️",
      cloudy: "☁️",
      snowy: "❄️",
    };

    return iconMap[condition] || "🌤️";
  }

  getWeatherDescription(condition: string): string {
    const descriptionMap: Record<string, string> = {
      sunny: "Bright and sunny",
      rainy: "Rainy weather",
      cloudy: "Cloudy skies",
      snowy: "Snow falling",
    };

    return descriptionMap[condition] || "Pleasant weather";
  }
}

export const weatherService = new WeatherService();
export type { WeatherData };

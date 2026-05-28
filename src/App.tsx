import { useEffect, useState } from 'react'
import { useSettings, applyTheme } from './store/settings'
import { usePlaces } from './store/places'
import { useWeather } from './hooks/useWeather'
import { Header } from './components/Header'
import { MetaBar } from './components/MetaBar'
import { WeatherHero } from './components/WeatherHero'
import { PlacesStrip } from './components/PlacesStrip'
import { HourlyStrip } from './components/HourlyStrip'
import { DailyForecast } from './components/DailyForecast'
import { AlertBanner } from './components/AlertBanner'
import { SkySection } from './components/SkySection'
import { Modal } from './components/Modal'
import { PlacesView } from './components/PlacesView'
import { Settings } from './components/Settings'
import { Atmosphere } from './components/atmosphere/Atmosphere'
import { ErrorBoundary } from './components/ErrorBoundary'
import { UpdateBanner } from './components/UpdateBanner'
import { PwaUpdateProvider } from './lib/PwaUpdate'
import './App.css'

function App() {
  const theme = useSettings((s) => s.theme)
  const loadPlaces = usePlaces((s) => s.loadPlaces)
  const [placesViewOpen, setPlacesViewOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const { weather, alerts, error, loading, coordsReady, placeName, placeRegion } = useWeather()

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  useEffect(() => {
    loadPlaces()
  }, [loadPlaces])

  return (
    <PwaUpdateProvider>
      <Atmosphere current={weather?.current} />
      <Header
        onOpenPlaces={() => setPlacesViewOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
      />
      <MetaBar />
      <ErrorBoundary>
        <WeatherHero
          weather={weather}
          loading={loading}
          error={error}
          coordsReady={coordsReady}
          placeName={placeName}
          placeRegion={placeRegion}
          onOpenPlaces={() => setPlacesViewOpen(true)}
        />
        <AlertBanner alerts={alerts} />
        <UpdateBanner />
        <PlacesStrip />
        {weather?.hourly && <HourlyStrip hourly={weather.hourly} />}
        {weather?.daily && <DailyForecast daily={weather.daily} />}
        <SkySection />
      </ErrorBoundary>
      <div className="footer">
        bewthr v0.1 {'\u00B7'} open source
      </div>

      <PlacesView
        open={placesViewOpen}
        onClose={() => setPlacesViewOpen(false)}
      />

      <Modal open={settingsOpen} title="Settings" onClose={() => setSettingsOpen(false)}>
        <Settings />
      </Modal>
    </PwaUpdateProvider>
  )
}

export default App

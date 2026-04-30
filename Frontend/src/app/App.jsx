import { Provider } from 'react-redux'
import { store } from './app.store'

const App = () => {
  return (
    <Provider store={store}>
      <div>App</div>
    </Provider>
  )
}

export default App
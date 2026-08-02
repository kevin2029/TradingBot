import { useEffect, useRef } from 'react'
import { simulationAdapter } from './simulationAdapter'
import { useAppDispatch, useAppState } from '../state/store'

/** Connects the active market feed adapter to the store. Swap `simulationAdapter`
 * for a real broker adapter (e.g. OANDA) without changing any component code. */
export function useMarketFeed() {
  const dispatch = useAppDispatch()
  const state = useAppState()
  const botOnRef = useRef(state.botOn)
  botOnRef.current = state.botOn

  useEffect(() => {
    const disconnect = simulationAdapter.connect(
      {
        onPrice: (asset, point) => dispatch({ type: 'PRICE_TICK', asset, point }),
        onTrade: (trade) => dispatch({ type: 'ADD_TRADE', trade }),
        onAlert: (alert) => dispatch({ type: 'ADD_ALERT', alert }),
        onLatency: (value) => dispatch({ type: 'SET_LATENCY', value }),
      },
      () => botOnRef.current,
    )
    return disconnect
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch])
}

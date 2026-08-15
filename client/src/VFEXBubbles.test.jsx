import { render, screen } from '@testing-library/react'
import VFEXBubbles from './VFEXBubbles'

test('renders selected bubble info', () => {
  render(<VFEXBubbles data={[{ ticker: 'TEST.vx', name: 'Test Co', change: 1.5, marketCap: 1000, closingPrice: 50 }]} />)
  expect(screen.getByText(/selected/i)).toBeInTheDocument()
  expect(screen.getByText(/test co/i)).toBeInTheDocument()
})

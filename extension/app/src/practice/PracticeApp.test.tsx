import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import PracticeApp from './PracticeApp';
import { transferRecords } from './recordStore';
jest.mock('./recordStore', () => ({ transferRecords: jest.fn() }));
jest.mock('../app/Main', () => () => <div>Original popup controls</div>);
beforeEach(() => { (transferRecords as jest.Mock).mockResolvedValue(undefined); });
afterEach(() => { delete window.chrome; jest.resetAllMocks(); });
test('the toolbar opens original manual controls without a live connection', async () => {
  window.chrome={runtime:{connect:jest.fn(()=>{throw Error('Worker asleep');})}};
  render(<PracticeApp/>);
  expect(await screen.findByText('Original popup controls')).toBeInTheDocument();
  expect(window.chrome.runtime.connect).not.toHaveBeenCalled();
});
test('Retry reruns failed storage initialization before opening the original popup', async () => {
  (transferRecords as jest.Mock).mockReset().mockRejectedValueOnce(Error('Could not verify saved settings. Original records are intact.')).mockResolvedValue(undefined);
  render(<PracticeApp/>);
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not verify saved settings. Original records are intact.');
  fireEvent.click(screen.getByRole('button',{name:'Retry'}));
  expect(await screen.findByText('Original popup controls')).toBeInTheDocument();
  await waitFor(()=>expect(transferRecords).toHaveBeenCalledTimes(2));
});

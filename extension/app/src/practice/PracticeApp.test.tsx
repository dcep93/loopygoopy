import { render, screen } from '@testing-library/react';
import PracticeApp from './PracticeApp';
jest.mock('../app/Main', () => () => <div>Original popup controls</div>);
afterEach(() => { delete window.chrome; });
test('opens manual controls even when the background worker is unavailable', () => {
  window.chrome = { runtime: {
    connect: jest.fn(() => { throw Error('Worker asleep'); }),
    sendMessage: jest.fn(() => { throw Error('Worker asleep'); }),
  } };
  render(<PracticeApp />);
  expect(screen.getByText('Original popup controls')).toBeInTheDocument();
  expect(window.chrome.runtime.connect).not.toHaveBeenCalled();
  expect(window.chrome.runtime.sendMessage).not.toHaveBeenCalled();
});

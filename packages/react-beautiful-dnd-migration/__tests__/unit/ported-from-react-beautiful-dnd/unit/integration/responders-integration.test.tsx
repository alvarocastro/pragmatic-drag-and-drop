// This file was copied from `react-beautiful-dnd` with some adjustments.
// <https://github.com/atlassian/react-beautiful-dnd/blob/v13.1.1/test/unit/integration/responders-integration.spec.js>

import React from 'react';

import { fireEvent, render, type RenderResult } from '@testing-library/react';
import type {
  BeforeCapture,
  DraggableId,
  DraggableLocation,
  DraggableProvided,
  DragStart,
  DroppableId,
  DroppableProvided,
  DropResult,
  Responders,
} from 'react-beautiful-dnd';
import invariant from 'tiny-invariant';

import { DragDropContext, Draggable, Droppable } from '../../../../../src';
import { setElementFromPoint } from '../../../_util';

import { mouse, simpleLift } from './_utils/controls';

const sloppyClickThreshold = 5;

const draggableId: DraggableId = 'drag-1';
const droppableId: DroppableId = 'drop-1';

type Props = {
  responders: Responders;
};

function App({ responders }: Props) {
  return (
    <DragDropContext
      onBeforeCapture={responders.onBeforeCapture}
      onBeforeDragStart={responders.onBeforeDragStart}
      onDragStart={responders.onDragStart}
      onDragUpdate={responders.onDragUpdate}
      onDragEnd={responders.onDragEnd}
    >
      <Droppable droppableId={droppableId}>
        {(droppableProvided: DroppableProvided) => (
          <div
            ref={droppableProvided.innerRef}
            {...droppableProvided.droppableProps}
          >
            <h2>Droppable</h2>
            <Draggable draggableId={draggableId} index={0}>
              {(draggableProvided: DraggableProvided) => (
                <div
                  data-testid="drag-handle"
                  ref={draggableProvided.innerRef}
                  {...draggableProvided.draggableProps}
                  {...draggableProvided.dragHandleProps}
                >
                  <h4>Draggable</h4>
                </div>
              )}
            </Draggable>
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}

describe('responders integration', () => {
  let responders: Responders;
  let wrapper: RenderResult;

  beforeEach(() => {
    jest.useFakeTimers();
    responders = {
      onBeforeCapture: jest.fn(),
      onBeforeDragStart: jest.fn(),
      onDragStart: jest.fn(),
      onDragUpdate: jest.fn(),
      onDragEnd: jest.fn(),
    };
    wrapper = render(<App responders={responders} />);
    // unmounting during a drag can cause a warning
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    // clean up any loose events
    wrapper.unmount();
    jest.useRealTimers();

    // @ts-expect-error - mock
    // eslint-disable-next-line no-console
    console.warn.mockRestore();
  });

  const drag = (() => {
    function getHandle(): HTMLElement {
      const handle: HTMLElement = wrapper.getByTestId('drag-handle');
      return handle;
    }

    const start = () => {
      setElementFromPoint(getHandle());
      simpleLift(mouse, getHandle());

      // movements are scheduled in an animation frame
      // @ts-expect-error - .step() not in types
      requestAnimationFrame.step();

      // drag start responder is scheduled with setTimeout
      jest.runOnlyPendingTimers();
    };

    const move = () => {
      fireEvent.drag(getHandle(), {
        x: 0,
        y: sloppyClickThreshold + 2,
      });

      // movements are scheduled in an animation frame
      // @ts-expect-error - .step() not in types
      requestAnimationFrame.step();
      // responder updates are scheduled with setTimeout
      jest.runOnlyPendingTimers();
    };

    const stop = () => {
      mouse.drop(getHandle());
      setElementFromPoint(document.body);

      // movements are scheduled in an animation frame
      // @ts-expect-error - .step() not in types
      requestAnimationFrame.step();
    };

    const cancel = () => {
      mouse.cancel(getHandle());
      setElementFromPoint(document.body);
    };

    const perform = () => {
      start();
      move();
      stop();
    };

    return { start, move, stop, cancel, perform };
  })();

  const expected = (() => {
    const source: DraggableLocation = {
      droppableId,
      index: 0,
    };

    const start: DragStart = {
      draggableId,
      type: 'DEFAULT',
      source,
      mode: 'FLUID',
    };

    // Unless we do some more hardcore stubbing
    // both completed and cancelled look the same.
    // Ideally we would move one item below another
    const completed: DropResult = {
      ...start,
      // did not move anywhere
      destination: source,
      combine: null,
      reason: 'DROP',
    };

    const cancelled: DropResult = {
      ...start,
      destination: null,
      combine: null,
      reason: 'CANCEL',
    };

    const beforeCapture: BeforeCapture = {
      draggableId: start.draggableId,
      mode: 'FLUID',
    };

    return { beforeCapture, start, completed, cancelled };
  })();

  const wasOnBeforeCaptureCalled = (
    amountOfDrags: number = 1,
    provided: Responders = responders,
  ) => {
    invariant(provided.onBeforeCapture);
    expect(provided.onBeforeCapture).toHaveBeenCalledTimes(amountOfDrags);
    // @ts-expect-error - mock property
    expect(provided.onBeforeCapture.mock.calls[amountOfDrags - 1][0]).toEqual(
      expected.beforeCapture,
    );
  };

  const wasOnBeforeDragCalled = (
    amountOfDrags: number = 1,
    provided: Responders = responders,
  ) => {
    invariant(provided.onBeforeDragStart);
    expect(provided.onBeforeDragStart).toHaveBeenCalledTimes(amountOfDrags);
    // @ts-expect-error - mock property
    expect(provided.onBeforeDragStart.mock.calls[amountOfDrags - 1][0]).toEqual(
      expected.start,
    );
  };

  const wasDragStarted = (
    amountOfDrags: number = 1,
    provided: Responders = responders,
  ) => {
    invariant(
      provided.onDragStart,
      'cannot validate if drag was started without onDragStart responder',
    );
    expect(provided.onDragStart).toHaveBeenCalledTimes(amountOfDrags);
    // @ts-expect-error - mock property
    expect(provided.onDragStart.mock.calls[amountOfDrags - 1][0]).toEqual(
      expected.start,
    );
  };

  const wasDragCompleted = (
    amountOfDrags: number = 1,
    provided: Responders = responders,
  ) => {
    expect(provided.onDragEnd).toHaveBeenCalledTimes(amountOfDrags);
    // @ts-expect-error - mock
    expect(provided.onDragEnd.mock.calls[amountOfDrags - 1][0]).toEqual(
      expected.completed,
    );
  };

  const wasDragCancelled = (amountOfDrags: number = 1) => {
    expect(responders.onDragEnd).toHaveBeenCalledTimes(amountOfDrags);
    // @ts-expect-error - mock
    expect(responders.onDragEnd.mock.calls[amountOfDrags - 1][0]).toEqual(
      expected.cancelled,
    );
  };

  describe('before capture', () => {
    it('should call the onBeforeDragCapture responder just before the drag starts', () => {
      drag.start();

      wasOnBeforeCaptureCalled();

      // cleanup
      drag.stop();
    });
  });

  describe('before drag start', () => {
    it('should call the onBeforeDragStart responder just before the drag starts', () => {
      drag.start();

      wasOnBeforeDragCalled();

      // cleanup
      drag.stop();
    });

    it('should not call onDragStart while the drag is occurring', () => {
      drag.start();

      wasOnBeforeDragCalled();

      drag.move();

      // should not have called on drag start again
      expect(responders.onBeforeDragStart).toHaveBeenCalledTimes(1);

      // cleanup
      drag.stop();
    });
  });

  describe('drag start', () => {
    it('should call the onDragStart responder when a drag starts', () => {
      drag.start();

      wasDragStarted();

      // cleanup
      drag.stop();
    });

    it('should not call onDragStart while the drag is occurring', () => {
      drag.start();

      wasDragStarted();

      drag.move();

      // should not have called on drag start again
      expect(responders.onDragStart).toHaveBeenCalledTimes(1);

      // cleanup
      drag.stop();
    });
  });

  describe('drag end', () => {
    it('should call the onDragEnd responder when a drag ends', () => {
      drag.perform();
      wasDragCompleted();
    });

    it('should call the onDragEnd responder when a drag ends when instantly stopped', () => {
      drag.start();
      drag.stop();

      wasDragCompleted();
    });
  });

  describe('drag cancel', () => {
    it('should call onDragEnd when a drag is canceled', () => {
      drag.start();
      drag.move();
      drag.cancel();

      wasDragCancelled();
    });

    it('should call onDragEnd when a drag is canceled instantly', () => {
      drag.start();
      drag.cancel();

      wasDragCancelled();
    });
  });

  describe('unmounted mid drag', () => {
    it('should cancel a drag if unmounted mid drag', () => {
      drag.start();

      wrapper.unmount();

      wasDragCancelled();
    });
  });

  describe('subsequent drags', () => {
    it('should publish subsequent drags', () => {
      drag.perform();
      wasDragStarted(1);
      wasDragCompleted(1);

      drag.perform();
      wasDragStarted(2);
      wasDragCompleted(2);
    });

    it('should publish subsequent drags after a cancel', () => {
      drag.start();
      drag.cancel();
      wasOnBeforeDragCalled(1);
      wasDragStarted(1);
      wasDragCancelled(1);

      drag.perform();
      wasOnBeforeDragCalled(2);
      wasDragStarted(2);
      wasDragCompleted(2);
    });
  });

  describe('dynamic responders', () => {
    const setResponders = (provided: Responders) => {
      wrapper.rerender(<App responders={provided} />);
    };

    it('should allow you to change responders before a drag started', () => {
      const newResponders: Responders = {
        onDragStart: jest.fn(),
        onDragEnd: jest.fn(),
      };
      setResponders(newResponders);

      drag.perform();

      // new responders called
      wasDragStarted(1, newResponders);
      wasDragCompleted(1, newResponders);
      // original responders not called
      expect(responders.onDragStart).not.toHaveBeenCalled();
      expect(responders.onDragEnd).not.toHaveBeenCalled();
    });

    it('should allow you to change onDragEnd during a drag', () => {
      const newResponders: Responders = {
        onDragEnd: jest.fn(),
      };

      drag.start();
      // changing the onDragEnd responder during a drag
      setResponders(newResponders);
      drag.stop();

      wasDragStarted(1, responders);
      // called the new responder that was changed during a drag
      wasDragCompleted(1, newResponders);
      // not calling original responder
      expect(responders.onDragEnd).not.toHaveBeenCalled();
    });

    it('should allow you to change responders between drags', () => {
      const newResponders: Responders = {
        onDragStart: jest.fn(),
        onDragEnd: jest.fn(),
      };

      // first drag
      drag.perform();
      wasDragStarted(1, responders);
      wasDragCompleted(1, responders);

      // second drag
      setResponders(newResponders);
      drag.perform();

      // new responders called for second drag
      wasDragStarted(1, newResponders);
      wasDragCompleted(1, newResponders);
      // original responders should not have been called again
      wasDragStarted(1, responders);
      wasDragCompleted(1, responders);
    });
  });
});

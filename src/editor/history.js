/**
 * Command-pattern Undo/Redo stack manager for interactive editing.
 */

export class CommandHistory {
  constructor(appState, onChangeCallback) {
    this.state = appState;
    this.onChange = onChangeCallback;
    this.undoStack = [];
    this.redoStack = [];
  }

  execute(command) {
    command.do(this.state);
    this.undoStack.push(command);
    this.redoStack = []; // Clear redo stack on new action
    if (this.onChange) this.onChange();
  }

  undo() {
    if (this.undoStack.length === 0) return;
    const command = this.undoStack.pop();
    command.undo(this.state);
    this.redoStack.push(command);
    if (this.onChange) this.onChange();
  }

  redo() {
    if (this.redoStack.length === 0) return;
    const command = this.redoStack.shift();
    command.do(this.state);
    this.undoStack.push(command);
    if (this.onChange) this.onChange();
  }

  clear() {
    this.undoStack = [];
    this.redoStack = [];
    if (this.onChange) this.onChange();
  }
}

// Commands Implementation
export class AddPointCommand {
  constructor(point) {
    this.point = point;
  }
  do(state) {
    state.addPoint(this.point);
  }
  undo(state) {
    state.removePointById(this.point.id);
  }
}

export class DeletePointCommand {
  constructor(point) {
    this.point = point;
  }
  do(state) {
    state.removePointById(this.point.id);
  }
  undo(state) {
    state.addPoint(this.point);
  }
}

export class MovePointCommand {
  constructor(pointId, oldX, oldY, newX, newY) {
    this.pointId = pointId;
    this.oldX = oldX;
    this.oldY = oldY;
    this.newX = newX;
    this.newY = newY;
  }
  do(state) {
    const p = state.points.find(p => p.id === this.pointId);
    if (p) {
      p.x = this.newX;
      p.y = this.newY;
    }
  }
  undo(state) {
    const p = state.points.find(p => p.id === this.pointId);
    if (p) {
      p.x = this.oldX;
      p.y = this.oldY;
    }
  }
}

export class BatchDeleteCommand {
  constructor(deletedPoints) {
    this.deletedPoints = deletedPoints; // Array of points
  }
  do(state) {
    const idsSet = new Set(this.deletedPoints.map(p => p.id));
    state.removePointsByIds(idsSet);
  }
  undo(state) {
    for (const p of this.deletedPoints) {
      state.addPoint(p);
    }
  }
}

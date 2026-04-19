"use client";

import { useEffect, useRef, useState } from "react";

const PANEL_MARGIN = 16;

const clampPosition = (position, panelWidth, panelHeight) => {
  if (typeof window === "undefined") {
    return position;
  }

  const maxX = Math.max(PANEL_MARGIN, window.innerWidth - panelWidth - PANEL_MARGIN);
  const maxY = Math.max(PANEL_MARGIN, window.innerHeight - panelHeight - PANEL_MARGIN);

  return {
    x: Math.min(Math.max(position.x, PANEL_MARGIN), maxX),
    y: Math.min(Math.max(position.y, PANEL_MARGIN), maxY),
  };
};

export const useFloatingPanel = ({
  fallbackWidth = 360,
  fallbackHeight = 220,
  getDefaultPosition,
}) => {
  const panelRef = useRef(null);
  const hasInitializedRef = useRef(false);
  const getDefaultPositionRef = useRef(getDefaultPosition);
  const frameRef = useRef(0);
  const pendingPositionRef = useRef(null);
  const dragStateRef = useRef({
    pointerId: null,
    offsetX: 0,
    offsetY: 0,
  });
  const dragMovedRef = useRef(false);
  const [position, setPosition] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    getDefaultPositionRef.current = getDefaultPosition;
  }, [getDefaultPosition]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (hasInitializedRef.current) {
      setPosition((current) => {
        if (!current) {
          return current;
        }

        const panelRect = panelRef.current?.getBoundingClientRect();

        return clampPosition(
          current,
          panelRect?.width || fallbackWidth,
          panelRect?.height || fallbackHeight
        );
      });
      return;
    }

    const defaultPosition = getDefaultPositionRef.current({
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      panelWidth: fallbackWidth,
      panelHeight: fallbackHeight,
    });

    hasInitializedRef.current = true;
    setPosition(clampPosition(defaultPosition, fallbackWidth, fallbackHeight));
  }, [fallbackHeight, fallbackWidth]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handlePointerMove = (event) => {
      if (dragStateRef.current.pointerId === null) {
        return;
      }

      dragMovedRef.current = true;

      const panelRect = panelRef.current?.getBoundingClientRect();
      const panelWidth = panelRect?.width || fallbackWidth;
      const panelHeight = panelRect?.height || fallbackHeight;

      pendingPositionRef.current = clampPosition({
        x: event.clientX - dragStateRef.current.offsetX,
        y: event.clientY - dragStateRef.current.offsetY,
      }, panelWidth, panelHeight);

      if (frameRef.current) {
        return;
      }

      frameRef.current = window.requestAnimationFrame(() => {
        frameRef.current = 0;

        if (pendingPositionRef.current) {
          setPosition(pendingPositionRef.current);
          pendingPositionRef.current = null;
        }
      });
    };

    const handlePointerEnd = () => {
      if (dragStateRef.current.pointerId === null) {
        return;
      }

      if (frameRef.current) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = 0;
      }

      if (pendingPositionRef.current) {
        setPosition(pendingPositionRef.current);
        pendingPositionRef.current = null;
      }

      dragStateRef.current.pointerId = null;
      setIsDragging(false);
    };

    const handleResize = () => {
      setPosition((current) => {
        if (!current) {
          return current;
        }

        const panelRect = panelRef.current?.getBoundingClientRect();
        return clampPosition(
          current,
          panelRect?.width || fallbackWidth,
          panelRect?.height || fallbackHeight
        );
      });
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerEnd);
    window.addEventListener("pointercancel", handlePointerEnd);
    window.addEventListener("resize", handleResize);

    return () => {
      if (frameRef.current) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = 0;
      }

      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerEnd);
      window.removeEventListener("pointercancel", handlePointerEnd);
      window.removeEventListener("resize", handleResize);
    };
  }, [fallbackHeight, fallbackWidth]);

  const handleDragStart = (event) => {
    if (event.button !== 0) {
      return;
    }

    const panelRect = panelRef.current?.getBoundingClientRect();

    if (!panelRect) {
      return;
    }

    dragMovedRef.current = false;
    dragStateRef.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - panelRect.left,
      offsetY: event.clientY - panelRect.top,
    };

    setIsDragging(true);
    event.preventDefault();
  };

  const checkWasDragged = () => {
    const result = dragMovedRef.current;
    dragMovedRef.current = false;
    return result;
  };

  return {
    panelRef,
    position,
    isDragging,
    handleDragStart,
    checkWasDragged,
  };
};

export default useFloatingPanel;

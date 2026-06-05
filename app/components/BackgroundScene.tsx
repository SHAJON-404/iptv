"use client";

import React from "react";

export default function BackgroundScene() {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: 0,
        backgroundColor: "#070414",
        overflow: "hidden",
        pointerEvents: "none",
      }}
    >
      {/* Deep Cyber Radial Glows */}
      <div
        style={{
          position: "absolute",
          top: "-20%",
          left: "-10%",
          width: "60%",
          height: "60%",
          background: "radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 70%)",
          filter: "blur(80px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "-20%",
          right: "-10%",
          width: "70%",
          height: "70%",
          background: "radial-gradient(circle, rgba(6, 182, 212, 0.12) 0%, transparent 70%)",
          filter: "blur(100px)",
        }}
      />

      {/* 3D Cyber Perspective Grid/Net */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: "-50%",
          width: "200%",
          height: "100%",
          perspective: "350px",
          perspectiveOrigin: "50% 0%",
        }}
      >
        <div
          style={{
            position: "absolute",
            width: "100%",
            height: "200%",
            top: 0,
            left: 0,
            backgroundImage: `
              linear-gradient(to right, rgba(139, 92, 246, 0.07) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(139, 92, 246, 0.07) 1px, transparent 1px)
            `,
            backgroundSize: "60px 60px",
            transform: "rotateX(75deg)",
            transformOrigin: "50% 0%",
            maskImage: "linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 80%)",
            WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 80%)",
          }}
        />
      </div>

      {/* Ambient Grid/Net Overlay on entire viewport for tech vibe */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `
            linear-gradient(to right, rgba(6, 182, 212, 0.02) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(6, 182, 212, 0.02) 1px, transparent 1px)
          `,
          backgroundSize: "30px 30px",
        }}
      />
    </div>
  );
}

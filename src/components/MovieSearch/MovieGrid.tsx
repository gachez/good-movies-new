'use client';

import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';

const moviePosters = [
  'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=300&h=450',
  'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=300&h=450',
  'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=300&h=450',
  'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=300&h=450',
  'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=300&h=450',
  'https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?w=300&h=450',
];

const MovieGrid = () => {
  return (
    <div className="fixed inset-0 z-0 opacity-10">
      <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 p-4">
        {[...Array(18)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatType: "reverse",
              delay: i * 0.2,
            }}
            className="aspect-[2/3] relative overflow-hidden rounded-lg"
          >
            <Image
              src={moviePosters[i % moviePosters.length]}
              alt="Movie poster"
              fill
              className="object-cover"
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default MovieGrid;
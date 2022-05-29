#ifndef NODE_H_
#define NODE_H_

#include <unordered_map>
#include <boost/uuid/uuid.hpp>
#include <boost/functional/hash.hpp>
#include <boost/geometry.hpp>
#include <boost/geometry/geometries/point.hpp>
#include <boost/geometry/geometries/segment.hpp>
#include <boost/geometry/index/rtree.hpp>

namespace kynedraw
{
  // RTree boilerplate taken from https://stackoverflow.com/a/25083918

  // Convenient namespaces
  namespace bg = boost::geometry;
  namespace bgm = boost::geometry::model;
  namespace bgi = boost::geometry::index;

  // Convenient types
  typedef bgm::point<double, 2, bg::cs::cartesian> point;
  typedef bgm::segment<point> segment;
  // The boost::uuids::uuid stores the uuids of the segment (VisibleBond) or of the point (VisibleNode)
  typedef bgi::rtree<std::pair<point, boost::uuids::uuid>, bgi::rstar<16>> point_rtree;
  typedef bgi::rtree<std::pair<segment, boost::uuids::uuid>, bgi::rstar<16>> segment_rtree;

  class Graph;
  class Molecule;
  class Node;
  class VisibleNode;
  class Bond;
  class VisibleBond;

}

#endif //NODE_H_

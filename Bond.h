#ifndef BOND_H_
#define BOND_H_

#include <boost/uuid/uuid.hpp>
#include <boost/uuid/uuid_generators.hpp>
#include <boost/geometry.hpp>
#include <boost/geometry/geometries/point.hpp>
#include <boost/geometry/geometries/segment.hpp>
#include <boost/geometry/index/rtree.hpp>

namespace kynedraw {
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

  class Molecule;
  class Node;
  class VisibleNode;
  class Bond;
  class VisibleBond;

  class GenericBond
  {
   protected:
    boost::uuids::uuid uuid;
    int numBonds;
   public:
    GenericBond(boost::uuids::uuid uuid, int numBonds);
    boost::uuids::uuid get_uuid() const;;
  };
  class Bond : public GenericBond
  {
   protected:
    std::vector<kynedraw::Node*> linkedNodes;
   public:
    Bond(boost::uuids::uuid uuid, int numBonds, kynedraw::Node &node1, kynedraw::Node &node2);
    const std::vector<kynedraw::Node*>& get_linked_nodes() const;
  };
  class VisibleBond : public GenericBond
  {
   protected:
    std::vector<kynedraw::VisibleNode*> linkedNodes;
    segment_rtree* rtree;
   public:
    VisibleBond(boost::uuids::uuid uuid, int numBonds, kynedraw::VisibleNode &node1, kynedraw::VisibleNode &node2, segment_rtree& rtree);
    const std::vector<kynedraw::VisibleNode*>& get_linked_nodes() const;
    void set_rtree_coordinates(int bondIndex, double initialX, double initialY, double finalX, double finalY);
  };
}

#endif //GITHUB__BOND_H_

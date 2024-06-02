import networkx as nx
import matplotlib.pyplot as plt
from geopy.geocoders import Nominatim
from geopy.distance import geodesic

def get_coordinates(location):
    geolocator = Nominatim(user_agent="myGeocoder")
    location = geolocator.geocode(location)
    if location:
        return (location.latitude, location.longitude)
    else:
        raise ValueError(f"Could not find location: {location}")

def get_distance(coord1, coord2):
    return geodesic(coord1, coord2).meters

def a_star_search(graph, start, end):
    # Ensure that the nodes exist in the graph
    if start not in graph or end not in graph:
        raise ValueError(f"Start or end node not in the graph: {start}, {end}")

    return nx.astar_path(
        graph,
        start,
        end,
        heuristic=lambda u, v: get_distance(graph.nodes[u]['pos'], graph.nodes[v]['pos']),
        weight='weight'
    )

def create_graph(locations):
    graph = nx.Graph()
    for location in locations:
        graph.add_node(location, pos=get_coordinates(location))
    return graph

def add_edges(graph, edges):
    for edge in edges:
        coord1 = graph.nodes[edge[0]]['pos']
        coord2 = graph.nodes[edge[1]]['pos']
        distance = get_distance(coord1, coord2)
        graph.add_edge(edge[0], edge[1], weight=distance)

def visualize_graph(graph, path=None):
    pos = nx.get_node_attributes(graph, 'pos')
    nx.draw(graph, pos, with_labels=True, node_size=300, node_color="skyblue", font_size=10, font_color="black")
    if path:
        path_edges = list(zip(path, path[1:]))
        nx.draw_networkx_edges(graph, pos, edgelist=path_edges, edge_color='r', width=2)
    plt.show()

def main():
    locations = ['New York, USA', 'Los Angeles, USA', 'Chicago, USA', 'Houston, USA', 'Phoenix, USA']
    edges = [
        ('New York, USA', 'Chicago, USA'), 
        ('Chicago, USA', 'Houston, USA'), 
        ('Houston, USA', 'Los Angeles, USA'), 
        ('New York, USA', 'Houston, USA'), 
        ('Phoenix, USA', 'Los Angeles, USA')
    ]
    
    graph = create_graph(locations)
    add_edges(graph, edges)
    
    start = 'New York, USA'
    end = 'Los Angeles, USA'
    path = a_star_search(graph, start, end)
    
    print(f"Shortest path from {start} to {end}: {path}")
    visualize_graph(graph, path)

if __name__ == "__main__":
    main()

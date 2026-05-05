"""
Name:   Santi Quiceno
CS230:  Section 5
Data:   Airports Around the World

Description:
    This program explores the "Airports Around the World" dataset to tell a story
    about global air transportation infrastructure. Users can interactively filter
    airports by continent, country, airport type, and elevation range. The app
    features a PyDeck map with hover details, a bar chart of airport counts by
    country, a pie chart of airport type distribution, and a sortable/filterable
    data table. Key analytics highlight which countries and regions have the most
    large airports and how airport size distribution varies globally.

References:
    - Streamlit documentation: https://docs.streamlit.io
    - PyDeck documentation: https://deckgl.readthedocs.io
    - Pandas documentation: https://pandas.pydata.org/docs/
    - Plotly documentation: https://plotly.com/python/
    - ISO country codes: https://en.wikipedia.org/wiki/ISO_3166-1
"""

import streamlit as st
import pandas as pd
import numpy as np
import plotly.express as px
import plotly.graph_objects as go
import pydeck as pdk

# ── Page config — must be the very first Streamlit call ──────────────────────
st.set_page_config(
    page_title="✈️ World Airport Explorer",
    page_icon="✈️",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ── Constants ─────────────────────────────────────────────────────────────────
AIRPORT_TYPES = {
    "large_airport":  "Large Airport",
    "medium_airport": "Medium Airport",
    "small_airport":  "Small Airport",
    "heliport":       "Heliport",
    "seaplane_base":  "Seaplane Base",
    "balloonport":    "Balloon Port",
    "closed":         "Closed",
}

CONTINENT_NAMES = {
    "AF": "Africa",
    "AN": "Antarctica",
    "AS": "Asia",
    "EU": "Europe",
    "NA": "North America",
    "OC": "Oceania",
    "SA": "South America",
}

TYPE_COLORS = {
    "large_airport":  "#e63946",
    "medium_airport": "#f4a261",
    "small_airport":  "#2a9d8f",
    "heliport":       "#457b9d",
    "seaplane_base":  "#a8dadc",
    "balloonport":    "#9b5de5",
    "closed":         "#adb5bd",
}


# ── Data loading ──────────────────────────────────────────────────────────────
@st.cache_data
def load_data():
    """Load and clean the airports and ISO country code datasets."""
    airports = pd.read_excel("airport-codes.xlsx")
    iso      = pd.read_excel("wikipedia-iso-country-codes.xlsx")

    # Rename ISO columns for easier merging
    iso.columns = ["country_name", "alpha2", "alpha3", "numeric", "iso3166_2"]

    # #[COLUMNS] – parse lat/lon from coordinates string, drop raw column
    airports[["longitude", "latitude"]] = (
        airports["coordinates"]
        .str.split(",", expand=True)
        .astype(float)
    )
    airports = airports.drop(columns=["coordinates"])

    # Merge country name
    airports = airports.merge(
        iso[["alpha2", "country_name"]],
        left_on="iso_country",
        right_on="alpha2",
        how="left",
    )

    # Map continent codes to full names
    airports["continent_name"] = airports["continent"].map(CONTINENT_NAMES).fillna("Unknown")

    # Fill missing country names
    airports["country_name"] = airports["country_name"].fillna(airports["iso_country"])

    return airports


# ── Helper / analytics functions ──────────────────────────────────────────────

# #[FUNC2P] – function with 2+ params, one has a default value
def filter_airports(df, continents=None, countries=None,
                    types=None, elev_range=(None, None)):
    """
    Filter the airports DataFrame.
    Returns filtered df and a summary dict (two values → #[FUNCRETURN2]).
    """
    result = df.copy()

    # #[FILTER1] – single condition filter
    if continents:
        result = result[result["continent_name"].isin(continents)]

    # #[FILTER2] – two-condition filter (countries AND types)
    if countries:
        result = result[result["country_name"].isin(countries)]
    if types:
        result = result[result["type"].isin(types)]

    lo, hi = elev_range
    if lo is not None and hi is not None:
        result = result[
            (result["elevation_ft"] >= lo) & (result["elevation_ft"] <= hi)
        ]

    summary = {
        "total": len(result),
        "countries": result["country_name"].nunique(),
    }
    return result, summary   # #[FUNCRETURN2]


# #[FUNCCALL2] – called in multiple places
def top_countries_by_type(df, airport_type="large_airport", n=10):
    """Return the top-n countries for a given airport type."""
    # #[FILTER1]
    filtered = df[df["type"] == airport_type]
    # #[SORT]
    return (
        filtered.groupby("country_name")
        .size()
        .reset_index(name="count")
        .sort_values("count", ascending=False)
        .head(n)
    )


def continent_type_pivot(df):
    """Build a pivot table of airport counts by continent × type."""
    # #[PIVOTTABLE]
    pivot = df.pivot_table(
        index="continent_name",
        columns="type",
        aggfunc="size",
        fill_value=0,
    )
    # Rename columns using the display dict
    pivot.columns = [AIRPORT_TYPES.get(c, c) for c in pivot.columns]
    return pivot


# #[LAMBDA] – sort continent names using a lambda
def sorted_continents(df):
    conts = df["continent_name"].dropna().unique().tolist()
    return sorted(conts, key=lambda x: x.lower())


# #[LISTCOMP] – build color list for bar chart bars
def build_color_list(types_list):
    return [TYPE_COLORS.get(t, "#888888") for t in types_list]


def elevation_stats(df):
    """Return max and min elevation airports. #[MAXMIN]"""
    valid = df.dropna(subset=["elevation_ft"])
    if valid.empty:
        return None, None
    # #[MAXMIN]
    highest = valid.loc[valid["elevation_ft"].idxmax()]
    lowest  = valid.loc[valid["elevation_ft"].idxmin()]
    return highest, lowest


# ── Sidebar widgets ────────────────────────────────────────────────────────────
def build_sidebar(df):
    st.sidebar.image(
        "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9b/Airplane_silhouette.svg/320px-Airplane_silhouette.svg.png",
        width=80,
    )
    st.sidebar.title("🔎 Filter Options")

    # #[ST1] – multi-select for continents
    all_continents = sorted_continents(df)
    sel_continents = st.sidebar.multiselect(
        "Continent(s)",
        options=all_continents,
        default=all_continents,
        help="Select one or more continents to explore.",
    )

    # #[ST1] – dropdown for airport type
    type_options = {AIRPORT_TYPES[k]: k for k in AIRPORT_TYPES}
    sel_type_labels = st.sidebar.multiselect(
        "Airport Type(s)",
        options=list(type_options.keys()),
        default=list(type_options.keys()),
    )
    sel_types = [type_options[l] for l in sel_type_labels]

    # Country list driven by continent selection
    cont_df = df[df["continent_name"].isin(sel_continents)] if sel_continents else df
    country_list = sorted(cont_df["country_name"].dropna().unique().tolist())
    sel_countries = st.sidebar.multiselect(
        "Country / Countries",
        options=country_list,
        default=[],
        help="Leave blank to include all countries.",
    )

    # #[ST2] – elevation range slider
    valid_elev = df["elevation_ft"].dropna()
    elev_min = int(valid_elev.min())
    elev_max = int(valid_elev.max())
    sel_elev = st.sidebar.slider(
        "Elevation Range (ft)",
        min_value=elev_min,
        max_value=elev_max,
        value=(elev_min, elev_max),
        step=100,
    )

    # Top-N slider for charts
    top_n = st.sidebar.slider("Top N Countries (charts)", 5, 30, 15, step=5)

    st.sidebar.markdown("---")
    st.sidebar.markdown(
        "<small>Data: OurAirports · ISO 3166</small>",
        unsafe_allow_html=True,
    )

    return sel_continents, sel_countries, sel_types, sel_elev, top_n


# ── Chart builders ─────────────────────────────────────────────────────────────

# #[CHART1] – customized bar chart
def bar_chart_top_countries(df, n=15):
    # #[SORT]
    counts = (
        df.groupby("country_name")
        .size()
        .reset_index(name="Airport Count")
        .sort_values("Airport Count", ascending=False)
        .head(n)
    )
    fig = px.bar(
        counts,
        x="country_name",
        y="Airport Count",
        title=f"Top {n} Countries by Total Airport Count",
        labels={"country_name": "Country", "Airport Count": "Number of Airports"},
        color="Airport Count",
        color_continuous_scale="Blues",
        text_auto=True,
    )
    fig.update_layout(
        xaxis_tickangle=-40,
        font=dict(family="Arial", size=13),
        plot_bgcolor="rgba(0,0,0,0)",
        coloraxis_showscale=False,
        title_font_size=16,
        margin=dict(b=80),
    )
    fig.update_traces(textfont_size=11, textposition="outside")
    return fig


# #[CHART2] – pie chart of airport type distribution
def pie_chart_types(df):
    counts = df["type"].value_counts().reset_index()
    counts.columns = ["type", "count"]
    # #[LISTCOMP] used here
    colors = build_color_list(counts["type"].tolist())
    counts["label"] = counts["type"].map(lambda t: AIRPORT_TYPES.get(t, t))
    fig = px.pie(
        counts,
        names="label",
        values="count",
        title="Airport Type Distribution",
        color_discrete_sequence=colors,
        hole=0.35,
    )
    fig.update_traces(textposition="inside", textinfo="percent+label")
    fig.update_layout(
        font=dict(family="Arial", size=13),
        legend_title_text="Type",
        title_font_size=16,
    )
    return fig


def bar_chart_large_airports(df, n=15):
    """Bar chart focused on large airports only – #[FUNCCALL2]."""
    data = top_countries_by_type(df, "large_airport", n)   # #[FUNCCALL2]
    fig = px.bar(
        data,
        x="country_name",
        y="count",
        title=f"Top {n} Countries with the Most Large Airports",
        labels={"country_name": "Country", "count": "Large Airport Count"},
        color="count",
        color_continuous_scale="Reds",
        text_auto=True,
    )
    fig.update_layout(
        xaxis_tickangle=-40,
        font=dict(family="Arial", size=13),
        plot_bgcolor="rgba(0,0,0,0)",
        coloraxis_showscale=False,
        title_font_size=16,
        margin=dict(b=80),
    )
    return fig


def stacked_bar_continent(df):
    """Stacked bar: airport types per continent."""
    pivot = continent_type_pivot(df).reset_index()
    type_cols = [c for c in pivot.columns if c != "continent_name"]
    fig = px.bar(
        pivot,
        x="continent_name",
        y=type_cols,
        barmode="stack",
        title="Airport Type Distribution by Continent",
        labels={"continent_name": "Continent", "value": "Count", "variable": "Type"},
    )
    fig.update_layout(
        font=dict(family="Arial", size=13),
        plot_bgcolor="rgba(0,0,0,0)",
        legend_title_text="Airport Type",
        title_font_size=16,
    )
    return fig


# ── Map builder ────────────────────────────────────────────────────────────────

# #[MAP] – PyDeck scatter map with color by type and hover tooltip
def build_pydeck_map(df, max_points=8000):
    map_df = df.dropna(subset=["latitude", "longitude"]).copy()

    # Downsample for performance
    if len(map_df) > max_points:
        map_df = map_df.sample(max_points, random_state=42)

    # Add hex color for each type
    def hex_to_rgb(h):
        h = h.lstrip("#")
        return [int(h[i:i+2], 16) for i in (0, 2, 4)]

    map_df["color"] = map_df["type"].map(
        lambda t: hex_to_rgb(TYPE_COLORS.get(t, "#888888"))
    )
    map_df["type_label"] = map_df["type"].map(lambda t: AIRPORT_TYPES.get(t, t))
    map_df["elev_display"] = map_df["elevation_ft"].fillna("N/A").astype(str)

    layer = pdk.Layer(
        "ScatterplotLayer",
        data=map_df,
        get_position="[longitude, latitude]",
        get_color="color",
        get_radius=12000,
        pickable=True,
        opacity=0.75,
        radius_min_pixels=2,
        radius_max_pixels=10,
    )
    view_state = pdk.ViewState(latitude=20, longitude=0, zoom=1.5, pitch=0)
    tooltip = {
        "html": (
            "<b>{name}</b><br/>"
            "Type: {type_label}<br/>"
            "Country: {country_name}<br/>"
            "Elevation: {elev_display} ft<br/>"
            "IATA: {iata_code}"
        ),
        "style": {
            "backgroundColor": "#1a3a5c",
            "color": "white",
            "fontSize": "13px",
            "padding": "8px",
            "borderRadius": "6px",
        },
    }
    deck = pdk.Deck(
        layers=[layer],
        initial_view_state=view_state,
        tooltip=tooltip,
        map_style="mapbox://styles/mapbox/light-v9",
    )
    return deck


# ── Main ───────────────────────────────────────────────────────────────────────
def main():
    # ── Custom CSS ────────────────────────────────────────────────────────────
    st.markdown("""
    <style>
        .main-title {
            font-size: 2.6rem;
            font-weight: 800;
            color: #1a3a5c;
            text-align: center;
            padding: 0.4rem 0 0.2rem 0;
        }
        .sub-title {
            font-size: 1.1rem;
            color: #4a6fa5;
            text-align: center;
            margin-bottom: 1.2rem;
        }
        .metric-card {
            background: linear-gradient(135deg, #1a3a5c, #4a6fa5);
            border-radius: 12px;
            padding: 1rem 1.4rem;
            color: white;
            text-align: center;
        }
        .metric-num  { font-size: 2rem; font-weight: 700; }
        .metric-label{ font-size: 0.85rem; opacity: 0.85; }
        .section-header {
            font-size: 1.35rem;
            font-weight: 700;
            color: #1a3a5c;
            border-left: 5px solid #4a6fa5;
            padding-left: 0.6rem;
            margin: 1.2rem 0 0.5rem 0;
        }
        .insight-box {
            background: #eef4fb;
            border-left: 4px solid #4a6fa5;
            border-radius: 6px;
            padding: 0.7rem 1rem;
            font-size: 0.92rem;
            color: #1a3a5c;
            margin-bottom: 0.8rem;
        }
    </style>
    """, unsafe_allow_html=True)

    df = load_data()

    # Sidebar
    sel_continents, sel_countries, sel_types, sel_elev, top_n = build_sidebar(df)

    # Apply filters  (#[FUNCCALL2] – called again here)
    filtered_df, summary = filter_airports(
        df,
        continents=sel_continents if sel_continents else None,
        countries=sel_countries if sel_countries else None,
        types=sel_types if sel_types else None,
        elev_range=sel_elev,
    )

    # ── Header ──────────────────────────────────────────────────────────────
    st.markdown('<div class="main-title">✈️ World Airport Explorer</div>', unsafe_allow_html=True)
    st.markdown(
        '<div class="sub-title">Explore global air transportation infrastructure '
        'through interactive charts, maps, and analytics</div>',
        unsafe_allow_html=True,
    )

    # ── KPI metrics ─────────────────────────────────────────────────────────
    c1, c2, c3, c4, c5 = st.columns(5)
    for col, label, val in [
        (c1, "Airports Shown",   f"{summary['total']:,}"),
        (c2, "Countries",         f"{summary['countries']:,}"),
        (c3, "Large Airports",    f"{(filtered_df['type']=='large_airport').sum():,}"),
        (c4, "Medium Airports",   f"{(filtered_df['type']=='medium_airport').sum():,}"),
        (c5, "Continents",        f"{filtered_df['continent_name'].nunique()}"),
    ]:
        with col:
            st.markdown(
                f'<div class="metric-card">'
                f'<div class="metric-num">{val}</div>'
                f'<div class="metric-label">{label}</div>'
                f'</div>',
                unsafe_allow_html=True,
            )

    st.markdown("<br/>", unsafe_allow_html=True)

    # ── Navigation tabs  (#[ST3] – multi-page navigation via tabs) ───────────
    tab1, tab2, tab3, tab4 = st.tabs(["🗺️ Map", "📊 Charts", "📋 Data Table", "📈 Analytics"])

    # ── TAB 1: MAP ────────────────────────────────────────────────────────────
    with tab1:
        st.markdown('<div class="section-header">Interactive Airport Map</div>', unsafe_allow_html=True)
        st.markdown(
            '<div class="insight-box">Each dot represents an airport, colored by type. '
            'Hover over any marker to see the airport name, country, type, and elevation. '
            'Up to 8,000 airports are shown at a time for performance.</div>',
            unsafe_allow_html=True,
        )

        # Legend
        leg_cols = st.columns(len(TYPE_COLORS))
        for i, (t, color) in enumerate(TYPE_COLORS.items()):
            with leg_cols[i]:
                st.markdown(
                    f'<span style="background:{color};border-radius:50%;display:inline-block;'
                    f'width:12px;height:12px;margin-right:4px;"></span>'
                    f'<small>{AIRPORT_TYPES[t]}</small>',
                    unsafe_allow_html=True,
                )

        st.pydeck_chart(build_pydeck_map(filtered_df), use_container_width=True)

    # ── TAB 2: CHARTS ─────────────────────────────────────────────────────────
    with tab2:
        st.markdown('<div class="section-header">Airport Distribution Charts</div>', unsafe_allow_html=True)

        col_a, col_b = st.columns(2)
        with col_a:
            st.markdown(
                '<div class="insight-box">The United States dominates total airport count '
                'due to a vast network of small general-aviation airfields.</div>',
                unsafe_allow_html=True,
            )
            st.plotly_chart(bar_chart_top_countries(filtered_df, top_n), use_container_width=True)

        with col_b:
            st.markdown(
                '<div class="insight-box">Small airports make up the majority of facilities '
                'worldwide, while large international airports are a small but critical share.</div>',
                unsafe_allow_html=True,
            )
            st.plotly_chart(pie_chart_types(filtered_df), use_container_width=True)

        st.markdown("---")
        col_c, col_d = st.columns(2)
        with col_c:
            st.markdown(
                '<div class="insight-box">The USA, UK, and France lead in large airport '
                'concentration, reflecting major global aviation hubs.</div>',
                unsafe_allow_html=True,
            )
            st.plotly_chart(bar_chart_large_airports(filtered_df, top_n), use_container_width=True)

        with col_d:
            st.markdown(
                '<div class="insight-box">South America and Europe have distinct airport '
                'type compositions compared to Asia and Africa.</div>',
                unsafe_allow_html=True,
            )
            st.plotly_chart(stacked_bar_continent(filtered_df), use_container_width=True)

    # ── TAB 3: DATA TABLE ─────────────────────────────────────────────────────
    with tab3:
        st.markdown('<div class="section-header">Airport Data Table</div>', unsafe_allow_html=True)

        # Sort controls
        sort_col = st.selectbox(
            "Sort by column",
            ["name", "country_name", "continent_name", "type", "elevation_ft"],
            index=0,
        )
        sort_asc = st.radio("Order", ["Ascending", "Descending"], horizontal=True) == "Ascending"

        # #[SORT]
        display_df = (
            filtered_df[["name", "type", "country_name", "continent_name",
                          "elevation_ft", "iata_code", "municipality", "latitude", "longitude"]]
            .rename(columns={
                "name": "Airport Name", "type": "Type",
                "country_name": "Country", "continent_name": "Continent",
                "elevation_ft": "Elevation (ft)", "iata_code": "IATA",
                "municipality": "City",
            })
            .sort_values(sort_col if sort_col in filtered_df.columns else "name",
                         ascending=sort_asc)
            .reset_index(drop=True)
        )
        display_df["Type"] = display_df["Type"].map(lambda t: AIRPORT_TYPES.get(t, t))

        st.markdown(f"Showing **{len(display_df):,}** airports")
        st.dataframe(display_df, use_container_width=True, height=500)

        # Download button
        csv = display_df.to_csv(index=False).encode("utf-8")
        st.download_button("📥 Download CSV", csv, "airports_filtered.csv", "text/csv")

    # ── TAB 4: ANALYTICS ──────────────────────────────────────────────────────
    with tab4:
        st.markdown('<div class="section-header">Deep-Dive Analytics</div>', unsafe_allow_html=True)

        # Continent pivot table
        st.subheader("Airport Counts by Continent & Type")
        pivot = continent_type_pivot(filtered_df)
        st.dataframe(pivot.style.background_gradient(cmap="Blues"), use_container_width=True)

        st.markdown("---")

        # Elevation extremes  #[MAXMIN]
        highest, lowest = elevation_stats(filtered_df)
        col_e, col_f = st.columns(2)
        if highest is not None:
            with col_e:
                st.subheader("🏔️ Highest Airport")
                st.metric("Name",      str(highest["name"]))
                st.metric("Country",   str(highest.get("country_name", "N/A")))
                st.metric("Elevation", f"{highest['elevation_ft']:,.0f} ft")

            with col_f:
                st.subheader("🌊 Lowest Airport")
                st.metric("Name",      str(lowest["name"]))
                st.metric("Country",   str(lowest.get("country_name", "N/A")))
                st.metric("Elevation", f"{lowest['elevation_ft']:,.0f} ft")

        st.markdown("---")

        # Top large airports – #[FUNCCALL2]
        st.subheader("🏆 Top Countries – Large Airports")
        top_large = top_countries_by_type(filtered_df, "large_airport", 20)
        st.dataframe(top_large.rename(columns={"country_name": "Country", "count": "Large Airports"}),
                     use_container_width=True)

        # #[ITERLOOP] – iterate over continent dict to show counts
        st.markdown("---")
        st.subheader("🌍 Airports per Continent (Current Filter)")
        cont_counts = filtered_df["continent_name"].value_counts().to_dict()
        rows = []
        for cont_name, cnt in cont_counts.items():   # #[ITERLOOP]
            rows.append({"Continent": cont_name, "Airport Count": cnt})
        st.dataframe(pd.DataFrame(rows).sort_values("Airport Count", ascending=False)
                     .reset_index(drop=True), use_container_width=True)

        # #[DICTMETHOD] – use .get() and .items()
        st.markdown("---")
        st.subheader("📖 Airport Type Reference")
        type_info = []
        for code, label in AIRPORT_TYPES.items():     # .items() → #[DICTMETHOD]
            count = cont_counts.get(code, 0)           # .get()   → #[DICTMETHOD]
            sample = filtered_df[filtered_df["type"] == code]["name"].head(1)
            sample_name = sample.values[0] if not sample.empty else "—"
            type_info.append({"Code": code, "Label": label, "Example": sample_name})
        st.dataframe(pd.DataFrame(type_info), use_container_width=True)


if __name__ == "__main__":
    main()